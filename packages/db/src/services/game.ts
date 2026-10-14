import {
  BP,
  SEASON_1,
  deriveMinerStatus,
  liveStreak,
  minerLabel,
  minerTraits,
  minerWeight,
  nextStreak,
  nextWeeklyCutoff,
  seasonDay,
  shiftClock,
  shiftDayOf,
  shiftShare,
  shiftWindow,
  streakBonus,
  workedBp,
  type EconomyParams,
  type MinerStatus,
  type MinerTraits,
} from "@hoodvalley/economy";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Database, DbOrTx, Tx } from "../client";
import { GameError } from "../errors";
import { accountBalance, accountHistory, ensureUserAccount, postLedgerTx, userAccountCode } from "../ledger";
import {
  dailyClaims,
  ledgerAccounts,
  ledgerTransactions,
  miningSessions,
  passes,
  payoutBatches,
  payoutItems,
  raffles,
  raffleTickets,
  shiftDays,
  slots,
  users,
} from "../schema";
import { getActiveConfig, getMaintenance, isMiningHalted, recordAlert, setFlag } from "../system";

/**
 * Valley HQ (litepaper §05): every Valley Miner works one 12-hour shift a day.
 *   Deploy (window open) → Extract (until it closes) → Claim (share of the day's pool) → Gear up.
 * The server owns the clock and every amount; the client only sends intent.
 */

const sinkAccount = (params: EconomyParams) => (params.sinkMode === "burn" ? "sink_burned" : "pool_mining");

async function loadActiveUser(tx: DbOrTx, userId: string) {
  const [u] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new GameError("UNAUTHORIZED");
  if (u.status === "frozen") throw new GameError("ACCOUNT_FROZEN", u.frozenReason ?? "This account is frozen.");
  return u;
}

async function lockSlot(tx: Tx, userId: string, slotId: string) {
  const [slot] = await tx
    .select()
    .from(slots)
    .where(and(eq(slots.id, slotId), eq(slots.userId, userId)))
    .limit(1)
    .for("update");
  if (!slot) throw new GameError("NOT_FOUND", "Miner not found.");
  const [pass] = await tx.select().from(passes).where(eq(passes.id, slot.passId)).limit(1);
  if (!pass) throw new GameError("NOT_FOUND", "Pass not found.");
  return { slot, pass };
}

function assertPassMines(pass: typeof passes.$inferSelect) {
  if (pass.status === "moved") {
    throw new GameError("PASS_MOVED", "This pass left the address it was airdropped to, so its Miner stopped permanently.");
  }
  if (pass.status !== "active") throw new GameError("PASS_INACTIVE", "This pass is not active.");
}

async function latestSession(tx: DbOrTx, slotId: string, lock = false) {
  const q = tx.select().from(miningSessions).where(eq(miningSessions.slotId, slotId)).orderBy(desc(miningSessions.day)).limit(1);
  const [s] = lock ? await q.for("update") : await q;
  return s ?? null;
}

/** Slots the player owns, optionally narrowed to the ones they picked. */
async function playerSlotIds(tx: DbOrTx, userId: string, picked?: string[]) {
  const rows = await tx
    .select({ id: slots.id })
    .from(slots)
    .innerJoin(passes, eq(passes.id, slots.passId))
    .where(picked?.length ? and(eq(slots.userId, userId), inArray(slots.id, picked)) : eq(slots.userId, userId))
    .orderBy(passes.passNumber);
  if (picked?.length && rows.length !== new Set(picked).size) throw new GameError("NOT_FOUND", "Miner not found.");
  return rows.map((r) => r.id);
}

function effectivePower(params: EconomyParams, traits: MinerTraits) {
  return params.traitPowerEnabled ? traits.powerBp : BP;
}

/** The shift day of the genesis ledger transaction, if it was posted. */
async function genesisDay(db: DbOrTx, params: EconomyParams): Promise<string | null> {
  const [g] = await db
    .select({ at: ledgerTransactions.createdAt })
    .from(ledgerTransactions)
    .where(eq(ledgerTransactions.idempotencyKey, "genesis"))
    .limit(1);
  return g ? shiftDayOf(params, g.at) : null;
}

/** Season 1 starts on the announced date, or on the genesis day until a date is set. */
export async function seasonStartDay(db: DbOrTx, params: EconomyParams): Promise<string | null> {
  return params.seasonStart ?? (await genesisDay(db, params));
}

/** Pool and total claim weight of one shift day. */
async function dayTotals(db: DbOrTx, days: string[]) {
  const out = new Map<string, { pool: bigint | null; weight: bigint; miners: number }>();
  if (!days.length) return out;
  const agg = await db
    .select({ day: miningSessions.day, weight: sql<string>`coalesce(sum(${miningSessions.weightBp}), 0)`, miners: sql<number>`count(*)` })
    .from(miningSessions)
    .where(inArray(miningSessions.day, days))
    .groupBy(miningSessions.day);
  const pools = await db.select().from(shiftDays).where(inArray(shiftDays.day, days));
  for (const d of days) {
    const a = agg.find((r) => r.day === d);
    const p = pools.find((r) => r.day === d);
    out.set(d, { pool: p ? BigInt(p.pool) : null, weight: BigInt(a?.weight ?? "0"), miners: Number(a?.miners ?? 0) });
  }
  return out;
}

/** Fixes a shift's pool the first time it is needed, from the config active when its window opened. */
async function ensureShiftDay(tx: DbOrTx, day: string, params: EconomyParams): Promise<bigint> {
  const [existing] = await tx.select().from(shiftDays).where(eq(shiftDays.day, day)).limit(1);
  if (existing) return BigInt(existing.pool);
  const cfg = await getActiveConfig(tx, shiftWindow(params, day).opensAt);
  await tx
    .insert(shiftDays)
    .values({ day, pool: BigInt(cfg.params.dailyPool), configVersion: cfg.version })
    .onConflictDoNothing({ target: shiftDays.day });
  const [row] = await tx.select().from(shiftDays).where(eq(shiftDays.day, day)).limit(1);
  return BigInt(row!.pool);
}

interface ValleyState {
  genesis: string | null;
  poolLeft: bigint;
  halted: boolean;
}

/** Sequential on purpose: a transaction is one connection and can't run queries in parallel. */
async function valleyState(db: DbOrTx, params: EconomyParams): Promise<ValleyState> {
  const genesis = await genesisDay(db, params);
  const poolLeft = await accountBalance(db, "pool_mining");
  const halted = await isMiningHalted(db);
  return { genesis, poolLeft, halted };
}

/** Why deploying is not possible right now, or null when the valley is open for work. */
function miningBlocker(v: ValleyState, params: EconomyParams, day: string): { code: "SEASON_NOT_STARTED" | "POOL_EXHAUSTED"; message: string } | null {
  if (!v.genesis) return { code: "POOL_EXHAUSTED", message: "Mining opens once the Season 1 pool is funded at genesis." };
  if (v.poolLeft <= 0n) return { code: "POOL_EXHAUSTED", message: "Season 1 is mined out. Mining for $VALLEY has closed." };
  if (v.halted) return { code: "POOL_EXHAUSTED", message: "Mining is paused by the team. Every claimed $VALLEY is safe." };
  const start = params.seasonStart ?? v.genesis;
  if (day < start) return { code: "SEASON_NOT_STARTED", message: `Season 1 opens on ${start}.` };
  return null;
}

// ------------------------------------------------------------------ views

export interface MinerView {
  slotId: string;
  passNumber: number;
  label: string;
  kind: MinerTraits["kind"];
  role: string;
  traits: string;
  helmet: string;
  tool: string;
  gem: string;
  background: string;
  powerBp: number;
  status: MinerStatus;
  session: {
    day: string;
    shift: number;
    deployedAt: string;
    endsAt: string;
    workedBp: number;
    weightBp: number;
    /** Final share once the window has closed; until then an estimate at the current weights. */
    share: string;
    reward: string | null;
    claimedAt: string | null;
    gearedAt: string | null;
  } | null;
}

export interface ActivityEntry {
  at: string;
  shift: number;
  text: string;
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const fmtAmount = (v: bigint) => v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Everything the Valley HQ shift screen shows, in one read. */
export async function getShift(db: DbOrTx, userId: string, now: Date) {
  const cfg = await getActiveConfig(db, now);
  const params = cfg.params;
  const clock = shiftClock(params, now);
  const valley = await valleyState(db, params);
  const start = params.seasonStart ?? valley.genesis;
  const blocker = miningBlocker(valley, params, clock.day);

  const owned = await db
    .select({ slot: slots, pass: passes })
    .from(slots)
    .innerJoin(passes, eq(passes.id, slots.passId))
    .where(eq(slots.userId, userId))
    .orderBy(passes.passNumber);
  const latest = new Map<string, typeof miningSessions.$inferSelect | null>();
  for (const { slot } of owned) latest.set(slot.id, await latestSession(db, slot.id));

  const days = [...new Set([clock.day, ...[...latest.values()].filter((s) => !!s).map((s) => s!.day)])];
  const totals = await dayTotals(db, days);
  const today = totals.get(clock.day)!;
  const todayPool = today.pool ?? BigInt(params.dailyPool);

  const miners: MinerView[] = owned.map(({ slot, pass }) => {
    const traits = minerTraits(pass.passNumber);
    const s = latest.get(slot.id) ?? null;
    const status = deriveMinerStatus(
      { passActive: pass.status === "active", latest: s ? { day: s.day, endsAt: s.endsAt, collectedAt: s.collectedAt, gearedAt: s.gearedAt } : null },
      clock,
      now,
    );
    let session: MinerView["session"] = null;
    if (s) {
      const t = totals.get(s.day)!;
      const pool = t.pool ?? BigInt(params.dailyPool);
      session = {
        day: s.day,
        shift: seasonDay(start, s.day),
        deployedAt: s.startedAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        workedBp: s.powerBp > 0 ? Math.round((s.weightBp * BP) / s.powerBp) : 0,
        weightBp: s.weightBp,
        share: (s.reward !== null ? BigInt(s.reward) : shiftShare(pool, s.weightBp, t.weight)).toString(),
        reward: s.reward === null ? null : String(s.reward),
        claimedAt: s.collectedAt?.toISOString() ?? null,
        gearedAt: s.gearedAt?.toISOString() ?? null,
      };
    }
    return {
      slotId: slot.id,
      passNumber: pass.passNumber,
      label: minerLabel(pass.passNumber),
      kind: traits.kind,
      role: traits.role,
      traits: `${traits.helmet} · ${traits.tool} · ${traits.background}`,
      helmet: traits.helmet,
      tool: traits.tool,
      gem: traits.gem,
      background: traits.background,
      powerBp: effectivePower(params, traits),
      status,
      session,
    };
  });

  // Season 1 progress, from the ledger and the shifts that actually ran.
  const poolLeft = valley.poolLeft;
  const [before] = await db
    .select({ total: sql<string>`coalesce(sum(${shiftDays.pool}), 0)` })
    .from(shiftDays)
    .where(lt(shiftDays.day, clock.day));
  const funded = valley.genesis !== null;
  const minedBefore = (() => {
    const v = BigInt(before?.total ?? "0");
    return v > SEASON_1.pool ? SEASON_1.pool : v;
  })();
  const claimed = funded && poolLeft < SEASON_1.pool ? SEASON_1.pool - poolLeft : 0n;
  const dayNo = seasonDay(start, clock.day);

  // Streak: consecutive shift days with a gear-up.
  const [lastGear] = await db.select().from(dailyClaims).where(eq(dailyClaims.userId, userId)).orderBy(desc(dailyClaims.day)).limit(1);
  const last = lastGear ? { day: lastGear.day, streak: lastGear.streak } : null;
  const streakDays = liveStreak(last, clock.day);

  // Holder raffle: one entry per active Miner.
  const [openRaffle] = await db.select().from(raffles).where(eq(raffles.status, "open")).orderBy(desc(raffles.id)).limit(1);
  let entered = 0;
  if (openRaffle) {
    const [mine] = await db
      .select({ n: sql<number>`coalesce(sum(${raffleTickets.count}), 0)` })
      .from(raffleTickets)
      .where(and(eq(raffleTickets.raffleId, openRaffle.id), eq(raffleTickets.userId, userId)));
    entered = Number(mine?.n ?? 0);
  }

  return {
    serverTime: now.toISOString(),
    clock: {
      day: clock.day,
      shift: dayNo,
      open: clock.open,
      opensAt: clock.opensAt.toISOString(),
      closesAt: clock.closesAt.toISOString(),
      nextOpensAt: clock.nextOpensAt.toISOString(),
      shiftHours: params.shiftHours,
      openHourUtc: params.shiftOpenHourUtc,
    },
    shift: {
      pool: todayPool.toString(),
      miners: today.miners,
      totalWeightBp: today.weight.toString(),
    },
    season: {
      number: SEASON_1.number,
      start,
      started: dayNo > 0,
      day: dayNo,
      days: params.seasonDays,
      funded,
      pool: SEASON_1.pool.toString(),
      poolLeft: poolLeft.toString(),
      minedBeforeToday: minedBefore.toString(),
      claimed: claimed.toString(),
      dailyPool: String(params.dailyPool),
    },
    miners,
    streak: {
      days: streakDays,
      gearedToday: last?.day === clock.day,
      // Once today's gear-up is done, the next bonus is tomorrow's (one day longer).
      nextBonus: streakBonus(params, last?.day === clock.day ? last.streak + 1 : nextStreak(last, clock.day)).toString(),
      bonusMaxDays: params.streakBonusMaxDays,
    },
    raffle: {
      openId: openRaffle?.id ?? null,
      title: openRaffle?.title ?? null,
      holder: openRaffle ? BigInt(openRaffle.ticketPrice) === 0n : false,
      entries: miners.filter((m) => m.status !== "stopped").length,
      entered,
    },
    blocker: blocker?.message ?? null,
    traitPowerEnabled: params.traitPowerEnabled,
    activity: await activityFeed(db, userId, params, start),
  };
}

/** Recent deploys, claims, gear-ups and raffle entries, grouped like the player did them. */
async function activityFeed(db: DbOrTx, userId: string, params: EconomyParams, start: string | null): Promise<ActivityEntry[]> {
  const sessions = await db
    .select({ s: miningSessions })
    .from(miningSessions)
    .innerJoin(slots, eq(slots.id, miningSessions.slotId))
    .where(eq(slots.userId, userId))
    .orderBy(desc(miningSessions.startedAt))
    .limit(40);
  const gears = await db.select().from(dailyClaims).where(eq(dailyClaims.userId, userId)).orderBy(desc(dailyClaims.day)).limit(40);
  const entries = await db
    .select({ raffleId: raffleTickets.raffleId, count: raffleTickets.count, at: raffleTickets.createdAt })
    .from(raffleTickets)
    .where(eq(raffleTickets.userId, userId))
    .orderBy(desc(raffleTickets.createdAt))
    .limit(10);

  type Ev = { at: Date; kind: "deploy" | "claim" | "gear"; n: number; amount: bigint };
  const groups = new Map<string, Ev>();
  const add = (at: Date | null, kind: Ev["kind"], amount = 0n) => {
    if (!at) return;
    const key = `${kind}:${at.getTime()}`;
    const g = groups.get(key) ?? { at, kind, n: 0, amount: 0n };
    g.n += 1;
    g.amount += amount;
    groups.set(key, g);
  };
  for (const { s } of sessions) {
    add(s.startedAt, "deploy");
    add(s.collectedAt, "claim", s.reward === null ? 0n : BigInt(s.reward));
    add(s.gearedAt, "gear");
  }
  const shiftOf = (at: Date) => seasonDay(start, shiftDayOf(params, at));
  const out: ActivityEntry[] = [...groups.values()].map((g) => {
    const shift = shiftOf(g.at);
    if (g.kind === "deploy") return { at: g.at.toISOString(), shift, text: `Deployed ${plural(g.n, "Miner")} to ${shift ? `shift ${shift}` : "the shift"}.` };
    if (g.kind === "claim") return { at: g.at.toISOString(), shift, text: `Claimed ${fmtAmount(g.amount)} $VALLEY from ${plural(g.n, "Miner")}.` };
    const gear = gears.find((d) => d.day === shiftDayOf(params, g.at));
    const bonus = gear && BigInt(gear.amount) > 0n && gear.createdAt.getTime() === g.at.getTime() ? ` +${fmtAmount(BigInt(gear.amount))} $VALLEY streak bonus.` : "";
    return {
      at: g.at.toISOString(),
      shift,
      text: `Geared up ${plural(g.n, "Miner")}.${gear ? ` Streak is ${plural(gear.streak, "day")}.` : ""}${bonus}`,
    };
  });
  for (const e of entries) {
    out.push({ at: e.at.toISOString(), shift: shiftOf(e.at), text: `Entered raffle #${e.raffleId} with ${plural(e.count, "entry", "entries")}.` });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

export async function getMe(db: DbOrTx, userId: string, now: Date) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new GameError("UNAUTHORIZED");
  const [pass] = await db.select().from(passes).where(eq(passes.userId, userId)).orderBy(passes.passNumber).limit(1);
  const cfg = await getActiveConfig(db, now);
  const balance = await accountBalance(db, userAccountCode(userId));
  const [paid] = await db
    .select({ total: sql<string>`coalesce(sum(${payoutItems.amount}), 0)` })
    .from(payoutItems)
    .where(and(eq(payoutItems.userId, userId), eq(payoutItems.status, "settled")));
  const maintenance = await getMaintenance(db);
  return {
    user: {
      id: user.id,
      discordUsername: user.discordUsername,
      role: user.role,
      status: user.status,
      walletAddress: user.walletAddress,
      walletLinkedAt: user.walletLinkedAt?.toISOString() ?? null,
    },
    pass: pass
      ? {
          id: pass.id,
          passNumber: pass.passNumber,
          inscriptionId: pass.inscriptionId,
          originAddress: pass.originAddress,
          status: pass.status,
          isTest: pass.isTest,
          lastOwnerCheckAt: pass.lastOwnerCheckAt?.toISOString() ?? null,
          lastSeenOwner: pass.lastSeenOwner,
        }
      : null,
    balance: balance.toString(),
    paidOutTotal: String(paid?.total ?? "0"),
    nextPayout: {
      cutoffAt: nextWeeklyCutoff(now, cfg.params.payout.weekday).toISOString(),
      weekday: cfg.params.payout.weekday,
      queued: balance.toString(),
      minimum: String(cfg.params.payout.minimum),
      destination: pass?.originAddress ?? null,
    },
    config: {
      version: cfg.version,
      shiftHours: cfg.params.shiftHours,
      dailyPool: String(cfg.params.dailyPool),
      raffleTicketPrice: String(cfg.params.raffleTicketPrice),
    },
    maintenance: maintenance.on,
    miningHalted: await isMiningHalted(db),
  };
}

// ------------------------------------------------------------------ the shift loop

/** Deploy: commit ready Miners to the open window. Joining late means a smaller share. */
export async function deployMiners(db: Database, p: { userId: string; slotIds: string[]; now: Date }) {
  if (!p.slotIds.length) throw new GameError("VALIDATION", "Select at least one ready Miner first.");
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const cfg = await getActiveConfig(tx, p.now);
    const clock = shiftClock(cfg.params, p.now);
    if (!clock.open) {
      throw new GameError("WINDOW_CLOSED", "The mining window is closed. Deploy when the next shift opens.", { opensAt: clock.nextOpensAt.toISOString() });
    }
    const blocked = miningBlocker(await valleyState(tx, cfg.params), cfg.params, clock.day);
    if (blocked) throw new GameError(blocked.code, blocked.message);
    const worked = workedBp(cfg.params, p.now, clock.closesAt);
    if (worked <= 0) throw new GameError("WINDOW_CLOSED", "Too late to join this shift.");

    const ids = await playerSlotIds(tx, p.userId, [...new Set(p.slotIds)]);
    const deployed: { slotId: string; weightBp: number }[] = [];
    for (const id of ids) {
      const { slot, pass } = await lockSlot(tx, p.userId, id);
      assertPassMines(pass);
      const s = await latestSession(tx, slot.id);
      const status = deriveMinerStatus(
        { passActive: true, latest: s ? { day: s.day, endsAt: s.endsAt, collectedAt: s.collectedAt, gearedAt: s.gearedAt } : null },
        clock,
        p.now,
      );
      const label = `Miner ${minerLabel(pass.passNumber)}`;
      if (status === "extracting") throw new GameError("SESSION_ALREADY_STARTED", `${label} is already on this shift.`);
      if (status === "claimable") throw new GameError("CLAIM_FIRST", `Claim ${label}'s last shift first.`);
      if (status === "needs_gear") throw new GameError("GEAR_UP_FIRST", `Gear up ${label} before its next shift.`);
      if (status === "geared") throw new GameError("SESSION_ALREADY_STARTED", `${label} already worked today's shift.`);

      const power = effectivePower(cfg.params, minerTraits(pass.passNumber));
      const weight = minerWeight(power, worked);
      const [row] = await tx
        .insert(miningSessions)
        .values({
          slotId: slot.id,
          day: clock.day,
          startedAt: p.now,
          endsAt: clock.closesAt,
          configVersion: cfg.version,
          level: 1,
          powerBp: power,
          weightBp: weight,
        })
        .onConflictDoNothing({ target: [miningSessions.slotId, miningSessions.day] })
        .returning({ id: miningSessions.id });
      if (!row) throw new GameError("SESSION_ALREADY_STARTED", `${label} already worked today's shift.`);
      await tx.update(slots).set({ state: "mining", brokenUntil: null, updatedAt: p.now }).where(eq(slots.id, slot.id));
      deployed.push({ slotId: slot.id, weightBp: weight });
    }
    await ensureShiftDay(tx, clock.day, cfg.params);
    return { deployed: deployed.length, miners: deployed, day: clock.day, closesAt: clock.closesAt.toISOString(), workedBp: worked, late: worked < BP - 20 };
  });
}

/** Claim: after the window closes, take each Miner's share of that day's pool. */
export async function claimMiners(db: Database, p: { userId: string; slotIds?: string[]; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const cfg = await getActiveConfig(tx, p.now);
    const ids = await playerSlotIds(tx, p.userId, p.slotIds);
    await ensureUserAccount(tx, p.userId);
    let total = 0n;
    let exhausted = false;
    const claimed: { slotId: string; day: string; share: string }[] = [];
    for (const id of ids) {
      const { slot, pass } = await lockSlot(tx, p.userId, id);
      const s = await latestSession(tx, slot.id, true);
      if (!s || s.collectedAt || p.now.getTime() < s.endsAt.getTime()) continue;
      assertPassMines(pass);
      const pool = await ensureShiftDay(tx, s.day, cfg.params);
      const [agg] = await tx
        .select({ weight: sql<string>`coalesce(sum(${miningSessions.weightBp}), 0)` })
        .from(miningSessions)
        .where(eq(miningSessions.day, s.day));
      let share = shiftShare(pool, s.weightBp, BigInt(agg?.weight ?? "0"));

      // Lock the mining pool so what's left can't change under us.
      const [acct] = await tx.select({ balance: ledgerAccounts.balance }).from(ledgerAccounts).where(eq(ledgerAccounts.code, "pool_mining")).for("update");
      const left = BigInt(acct?.balance ?? "0");
      if (share >= left && share > 0n) {
        exhausted = true;
        share = left;
      }
      if (share > 0n) {
        await postLedgerTx(tx, {
          idempotencyKey: `claim:${s.id}`,
          kind: "shift_claim",
          refType: "mining_session",
          refId: s.id,
          actor: `user:${p.userId}`,
          memo: `shift ${s.day} · Miner ${minerLabel(pass.passNumber)}`,
          entries: [
            { account: "pool_mining", amount: -share },
            { account: userAccountCode(p.userId), amount: share },
          ],
        });
      }
      await tx.update(miningSessions).set({ collectedAt: p.now, reward: share }).where(eq(miningSessions.id, s.id));
      await tx.update(slots).set({ state: "idle", updatedAt: p.now }).where(eq(slots.id, slot.id));
      total += share;
      claimed.push({ slotId: slot.id, day: s.day, share: share.toString() });
    }
    if (!claimed.length) throw new GameError("NOTHING_TO_CLAIM", "Nothing to claim yet. Shares unlock when the shift ends.");
    if (exhausted) {
      await setFlag(tx, "mining_halted", { on: true, at: p.now.toISOString() }, "system");
      await recordAlert(tx, "critical", "pool_exhausted", "Season 1 mining pool is empty. Mining has been stopped.");
    }
    return { claimed: claimed.length, miners: claimed, total: total.toString(), poolExhausted: exhausted };
  });
}

/** Gear up: ready claimed Miners for the next shift. The first gear-up of a day extends the streak. */
export async function gearUpMiners(db: Database, p: { userId: string; slotIds?: string[]; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const cfg = await getActiveConfig(tx, p.now);
    const today = shiftClock(cfg.params, p.now).day;
    const ids = await playerSlotIds(tx, p.userId, p.slotIds);
    let geared = 0;
    for (const id of ids) {
      const { slot, pass } = await lockSlot(tx, p.userId, id);
      const s = await latestSession(tx, slot.id, true);
      if (!s || !s.collectedAt || s.gearedAt) continue;
      assertPassMines(pass);
      await tx.update(miningSessions).set({ gearedAt: p.now }).where(eq(miningSessions.id, s.id));
      geared++;
    }
    if (!geared) throw new GameError("NOTHING_TO_GEAR", "Only Miners that have claimed need gearing up.");

    const [last] = await tx.select().from(dailyClaims).where(eq(dailyClaims.userId, p.userId)).orderBy(desc(dailyClaims.day)).limit(1).for("update");
    if (last?.day === today) return { geared, streak: last.streak, bonus: "0" };
    const streak = nextStreak(last ? { day: last.day, streak: last.streak } : null, today);
    let bonus = streakBonus(cfg.params, streak);
    const community = await accountBalance(tx, "pool_community");
    if (bonus > community) bonus = community;
    const [row] = await tx.insert(dailyClaims).values({ userId: p.userId, day: today, streak, amount: bonus, createdAt: p.now }).onConflictDoNothing().returning();
    if (row && bonus > 0n) {
      await ensureUserAccount(tx, p.userId);
      await postLedgerTx(tx, {
        idempotencyKey: `streak:${p.userId}:${today}`,
        kind: "streak_bonus",
        refType: "daily_claim",
        refId: `${p.userId}:${today}`,
        actor: `user:${p.userId}`,
        memo: `streak ${streak}`,
        entries: [
          { account: "pool_community", amount: -bonus },
          { account: userAccountCode(p.userId), amount: bonus },
        ],
      });
    }
    return { geared, streak: row ? streak : (last?.streak ?? streak), bonus: row ? bonus.toString() : "0" };
  });
}

// ------------------------------------------------------------------ raffles

/** Holder raffles (ticket price 0): one free entry per active Valley Miner, once per raffle. */
export async function enterHolderRaffle(db: Database, p: { userId: string; raffleId: number; tipHeight: number | null; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const [raffle] = await tx.select().from(raffles).where(eq(raffles.id, p.raffleId)).limit(1).for("update");
    if (!raffle) throw new GameError("NOT_FOUND", "Raffle not found.");
    if (raffle.status !== "open") throw new GameError("RAFFLE_CLOSED", "Entries have closed.");
    if (p.tipHeight !== null && p.tipHeight >= raffle.closeBlockHeight - 1) throw new GameError("RAFFLE_CLOSED", "The draw block is about to be produced.");
    if (BigInt(raffle.ticketPrice) > 0n) throw new GameError("VALIDATION", "This raffle uses tickets.");
    const key = `holder:${raffle.id}:${p.userId}`;
    const [done] = await tx.select().from(raffleTickets).where(eq(raffleTickets.idempotencyKey, key)).limit(1);
    if (done) return { replayed: true, count: done.count, startIndex: done.startIndex };
    const [{ n } = { n: 0 }] = await tx
      .select({ n: sql<number>`count(*)` })
      .from(passes)
      .where(and(eq(passes.userId, p.userId), eq(passes.status, "active")));
    const count = Number(n);
    if (count < 1) throw new GameError("NO_PASS", "Holder raffles need an active Valley Miner.");
    const startIndex = raffle.totalTickets;
    await tx.insert(raffleTickets).values({ raffleId: raffle.id, userId: p.userId, startIndex, count, idempotencyKey: key, createdAt: p.now });
    await tx.update(raffles).set({ totalTickets: raffle.totalTickets + count }).where(eq(raffles.id, raffle.id));
    return { replayed: false, count, startIndex };
  });
}

/** Paid raffles: tickets bought with in-game $VALLEY leave circulation (burned or recycled). */
export async function buyRaffleTickets(
  db: Database,
  p: { userId: string; raffleId: number; count: number; idempotencyKey: string; tipHeight: number | null; now: Date },
) {
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > 100) throw new GameError("VALIDATION", "Buy 1–100 tickets at a time.");
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const [pass] = await tx.select().from(passes).where(eq(passes.userId, p.userId)).limit(1);
    if (!pass) throw new GameError("NO_PASS", "Raffles are for Valley Miner holders.");
    const [raffle] = await tx.select().from(raffles).where(eq(raffles.id, p.raffleId)).limit(1).for("update");
    if (!raffle) throw new GameError("NOT_FOUND", "Raffle not found.");
    if (raffle.status !== "open") throw new GameError("RAFFLE_CLOSED", "Ticket sales have closed.");
    if (BigInt(raffle.ticketPrice) <= 0n) throw new GameError("VALIDATION", "This is a holder raffle: enter with your Miners instead.");
    if (p.tipHeight !== null && p.tipHeight >= raffle.closeBlockHeight - 1) {
      throw new GameError("RAFFLE_CLOSED", "The closing block is about to be mined.");
    }
    const cost = BigInt(raffle.ticketPrice) * BigInt(p.count);
    const cfg = await getActiveConfig(tx, p.now);
    await ensureUserAccount(tx, p.userId);
    const res = await postLedgerTx(tx, {
      idempotencyKey: `raffle:${raffle.id}:${p.userId}:${p.idempotencyKey}`,
      kind: "raffle_ticket",
      refType: "raffle",
      refId: String(raffle.id),
      actor: `user:${p.userId}`,
      memo: `${p.count} ticket(s)`,
      entries: [
        { account: userAccountCode(p.userId), amount: -cost },
        { account: sinkAccount(cfg.params), amount: cost },
      ],
    });
    if (!res.created) return { replayed: true, count: p.count, cost: cost.toString() };
    const startIndex = raffle.totalTickets;
    await tx.insert(raffleTickets).values({
      raffleId: raffle.id,
      userId: p.userId,
      startIndex,
      count: p.count,
      idempotencyKey: `raffle:${raffle.id}:${p.userId}:${p.idempotencyKey}`,
    });
    await tx
      .update(raffles)
      .set({ totalTickets: raffle.totalTickets + p.count })
      .where(eq(raffles.id, raffle.id));
    return { replayed: false, count: p.count, cost: cost.toString(), startIndex };
  });
}

// ------------------------------------------------------------------ history

export async function ledgerHistory(db: DbOrTx, userId: string, cursor?: number, limit?: number) {
  return accountHistory(db, userAccountCode(userId), { cursor, limit });
}

export async function payoutHistory(db: DbOrTx, userId: string) {
  const rows = await db
    .select({
      week: payoutBatches.week,
      batchStatus: payoutBatches.status,
      amount: payoutItems.amount,
      status: payoutItems.status,
      address: payoutItems.address,
      inscribeTxid: payoutItems.inscribeTxid,
      sendTxid: payoutItems.sendTxid,
      updatedAt: payoutItems.updatedAt,
    })
    .from(payoutItems)
    .innerJoin(payoutBatches, eq(payoutBatches.id, payoutItems.batchId))
    .where(eq(payoutItems.userId, userId))
    .orderBy(desc(payoutBatches.createdAt))
    .limit(52);
  return rows.map((r) => ({ ...r, amount: String(r.amount), updatedAt: r.updatedAt.toISOString() }));
}

/** Admin runway: days of mining left at the current daily pool, and how full recent shifts were. */
export async function shiftStats(db: DbOrTx, now: Date) {
  const cfg = await getActiveConfig(db, now);
  const clock = shiftClock(cfg.params, now);
  const recent = await db
    .select({ day: miningSessions.day, miners: sql<number>`count(*)`, claimed: sql<string>`coalesce(sum(${miningSessions.reward}), 0)` })
    .from(miningSessions)
    .groupBy(miningSessions.day)
    .orderBy(desc(miningSessions.day))
    .limit(7);
  const [unclaimed] = await db
    .select({ n: sql<number>`count(*)` })
    .from(miningSessions)
    .where(and(isNull(miningSessions.collectedAt), lt(miningSessions.endsAt, now)));
  return {
    day: clock.day,
    open: clock.open,
    recent: recent.map((r) => ({ day: r.day, miners: Number(r.miners), claimed: String(r.claimed) })),
    unclaimedShares: Number(unclaimed?.n ?? 0),
  };
}
