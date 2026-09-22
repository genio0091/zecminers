import { randomInt } from "node:crypto";
import {
  BP,
  computeReward,
  dailyReward,
  deriveSlotState,
  durabilityMax,
  HOUR_MS,
  levelMultiplierBp,
  nextStreak,
  nextWeeklyCutoff,
  oreExchangeValue,
  ORES,
  previousUtcDay,
  ratePerHour,
  repairCost,
  rollOreDrops,
  sessionDurationMs,
  upgradeCost,
  utcDay,
  type DerivedSlotState,
  type EconomyParams,
  type OreId,
  type RandomInt,
} from "@zecminers/economy";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database, DbOrTx, Tx } from "../client";
import { GameError } from "../errors";
import { accountBalance, accountHistory, ensureUserAccount, postLedgerTx, userAccountCode } from "../ledger";
import {
  dailyClaims,
  inventory,
  inventoryMovements,
  ledgerAccounts,
  miningSessions,
  passes,
  payoutBatches,
  payoutItems,
  raffles,
  raffleTickets,
  slots,
  users,
} from "../schema";
import {
  getActiveConfig,
  getConfigVersion,
  getMaintenance,
  isMiningHalted,
  recordAlert,
  setFlag,
} from "../system";

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
  if (!slot) throw new GameError("NOT_FOUND", "Slot not found.");
  const [pass] = await tx.select().from(passes).where(eq(passes.id, slot.passId)).limit(1);
  if (!pass) throw new GameError("NOT_FOUND", "Pass not found.");
  return { slot, pass };
}

function assertPassMines(pass: typeof passes.$inferSelect) {
  if (pass.status === "moved") {
    throw new GameError("PASS_MOVED", "This pass left the address it was airdropped to, so the slot stopped permanently.");
  }
  if (pass.status !== "active") throw new GameError("PASS_INACTIVE", "This pass is not active.");
}

async function openSession(tx: DbOrTx, slotId: string) {
  const [s] = await tx
    .select()
    .from(miningSessions)
    .where(and(eq(miningSessions.slotId, slotId), isNull(miningSessions.collectedAt)))
    .orderBy(desc(miningSessions.startedAt))
    .limit(1);
  return s ?? null;
}

// ------------------------------------------------------------------ views

export interface SlotView {
  id: string;
  name: string;
  level: number;
  durability: number;
  durabilityMax: number;
  state: DerivedSlotState;
  brokenUntil: string | null;
  usedToday: boolean;
  ratePerHour: number;
  upgradeCost: string | null;
  repairCost: string;
  pickaxeEnabled: boolean;
  session: {
    id: string;
    startedAt: string;
    endsAt: string;
    accrued: string;
    progressBp: number;
    /** Inputs so the client can tick the estimate locally; the server still decides at collect. */
    baseRatePerHour: number;
    levelMultiplierBp: number;
    sessionMs: number;
  } | null;
  nextResetAt: string;
}

export async function listSlots(db: DbOrTx, userId: string, now: Date): Promise<SlotView[]> {
  const cfg = await getActiveConfig(db, now);
  const rows = await db
    .select({ slot: slots, pass: passes })
    .from(slots)
    .innerJoin(passes, eq(passes.id, slots.passId))
    .where(eq(slots.userId, userId));
  const today = utcDay(now);
  const out: SlotView[] = [];
  for (const { slot, pass } of rows) {
    const session = await openSession(db, slot.id);
    const [todays] = await db
      .select({ id: miningSessions.id })
      .from(miningSessions)
      .where(and(eq(miningSessions.slotId, slot.id), eq(miningSessions.day, today)))
      .limit(1);
    const state = deriveSlotState(
      { state: slot.state, brokenUntil: slot.brokenUntil, durability: slot.durability, passActive: pass.status === "active", session },
      now,
    );
    let sessionView: SlotView["session"] = null;
    if (session) {
      const params = await getConfigVersion(db, session.configVersion);
      const elapsed = Math.min(now.getTime(), session.endsAt.getTime()) - session.startedAt.getTime();
      sessionView = {
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        accrued: computeReward({ params, level: session.level, elapsedMs: elapsed }).toString(),
        progressBp: Math.min(BP, Math.floor((elapsed / sessionDurationMs(params)) * BP)),
        baseRatePerHour: params.baseRatePerHour,
        levelMultiplierBp: levelMultiplierBp(params, session.level),
        sessionMs: sessionDurationMs(params),
      };
    }
    const up = upgradeCost(cfg.params, slot.level);
    out.push({
      id: slot.id,
      name: slot.name,
      level: slot.level,
      durability: slot.durability,
      durabilityMax: durabilityMax(cfg.params, slot.level),
      state,
      brokenUntil: slot.brokenUntil?.toISOString() ?? null,
      usedToday: !!todays,
      ratePerHour: ratePerHour(cfg.params, session?.level ?? slot.level),
      upgradeCost: up === null ? null : String(up),
      repairCost: String(repairCost(cfg.params, slot.level)),
      pickaxeEnabled: cfg.params.pickaxeEnabled,
      session: sessionView,
      nextResetAt: new Date(Date.parse(`${today}T00:00:00Z`) + 24 * HOUR_MS).toISOString(),
    });
  }
  return out;
}

export async function getMe(db: DbOrTx, userId: string, now: Date) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new GameError("UNAUTHORIZED");
  const [pass] = await db.select().from(passes).where(eq(passes.userId, userId)).limit(1);
  const cfg = await getActiveConfig(db, now);
  const balance = await accountBalance(db, userAccountCode(userId));
  const [lastClaim] = await db
    .select()
    .from(dailyClaims)
    .where(eq(dailyClaims.userId, userId))
    .orderBy(desc(dailyClaims.day))
    .limit(1);
  const today = utcDay(now);
  const streakIfClaimed = nextStreak(cfg.params, lastClaim ? { day: lastClaim.day, streak: lastClaim.streak } : null, today);
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
          lastOwnerCheckAt: pass.lastOwnerCheckAt?.toISOString() ?? null,
          lastSeenOwner: pass.lastSeenOwner,
        }
      : null,
    balance: balance.toString(),
    paidOutTotal: String(paid?.total ?? "0"),
    daily: {
      claimedToday: lastClaim?.day === today,
      streak: lastClaim && (lastClaim.day === today || lastClaim.day === previousUtcDay(today)) ? lastClaim.streak : 0,
      nextAmount: dailyReward(cfg.params, streakIfClaimed).toString(),
      streakMax: cfg.params.dailyStreakMax,
    },
    nextPayout: {
      cutoffAt: nextWeeklyCutoff(now, cfg.params.payout.weekday).toISOString(),
      weekday: cfg.params.payout.weekday,
      queued: balance.toString(),
      minimum: String(cfg.params.payout.minimum),
      destination: pass?.originAddress ?? null,
    },
    config: {
      version: cfg.version,
      sessionHours: cfg.params.sessionHours,
      baseRatePerHour: cfg.params.baseRatePerHour,
      raffleTicketPrice: String(cfg.params.raffleTicketPrice),
      oreExchange: cfg.params.oreExchange,
    },
    maintenance: maintenance.on,
    miningHalted: await isMiningHalted(db),
  };
}

// ------------------------------------------------------------------ mining

export async function startSession(db: Database, p: { userId: string; slotId: string; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const { slot, pass } = await lockSlot(tx, p.userId, p.slotId);
    assertPassMines(pass);
    if (await isMiningHalted(tx)) throw new GameError("POOL_EXHAUSTED", "The mining pool is empty. Mining has stopped.");

    let state = slot.state;
    if (state === "broken") {
      if (!slot.brokenUntil) throw new GameError("SLOT_BROKEN", "The pickaxe is broken. Repair it first.");
      if (slot.brokenUntil.getTime() > p.now.getTime()) {
        throw new GameError("SLOT_BROKEN", "Repair in progress.", { readyAt: slot.brokenUntil.toISOString() });
      }
      state = "idle";
    }
    if (state === "mining") throw new GameError("SESSION_ALREADY_STARTED", "A session is already running. Collect it first.");

    const cfg = await getActiveConfig(tx, p.now);
    if (cfg.params.pickaxeEnabled && slot.durability <= 0) throw new GameError("SLOT_BROKEN", "The pickaxe is worn out.");
    if ((await accountBalance(tx, "pool_mining")) <= 0n) throw new GameError("POOL_EXHAUSTED");

    const day = utcDay(p.now);
    const [session] = await tx
      .insert(miningSessions)
      .values({
        slotId: slot.id,
        day,
        startedAt: p.now,
        endsAt: new Date(p.now.getTime() + sessionDurationMs(cfg.params)),
        configVersion: cfg.version,
        level: slot.level,
      })
      .onConflictDoNothing({ target: [miningSessions.slotId, miningSessions.day] })
      .returning();
    if (!session) {
      throw new GameError("SESSION_ALREADY_STARTED", "Today's session is already used. Next reset at 00:00 UTC.");
    }
    await tx
      .update(slots)
      .set({ state: "mining", brokenUntil: null, updatedAt: p.now })
      .where(eq(slots.id, slot.id));
    return { sessionId: session.id, startedAt: session.startedAt.toISOString(), endsAt: session.endsAt.toISOString() };
  });
}

export async function collectSession(
  db: Database,
  p: { userId: string; slotId: string; now: Date; rng?: RandomInt },
) {
  const rng = p.rng ?? ((max: number) => randomInt(max));
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const { slot, pass } = await lockSlot(tx, p.userId, p.slotId);
    const [session] = await tx
      .select()
      .from(miningSessions)
      .where(and(eq(miningSessions.slotId, slot.id), isNull(miningSessions.collectedAt)))
      .orderBy(desc(miningSessions.startedAt))
      .limit(1)
      .for("update");
    if (!session || slot.state !== "mining") throw new GameError("NO_ACTIVE_SESSION", "Nothing to collect.");
    assertPassMines(pass);

    const params = await getConfigVersion(tx, session.configVersion);
    const end = Math.min(p.now.getTime(), session.endsAt.getTime());
    const elapsed = Math.max(0, end - session.startedAt.getTime());
    let reward = computeReward({ params, level: session.level, elapsedMs: elapsed });

    await ensureUserAccount(tx, p.userId);
    // Lock the pool first so the remaining balance can't change under us.
    const [pool] = await tx
      .select({ balance: ledgerAccounts.balance })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.code, "pool_mining"))
      .for("update");
    const poolLeft = BigInt(pool?.balance ?? "0");
    let exhausted = false;
    if (reward >= poolLeft) {
      exhausted = reward > 0n;
      reward = poolLeft;
    }
    if (reward > 0n) {
      await postLedgerTx(tx, {
        idempotencyKey: `collect:${session.id}`,
        kind: "mining_collect",
        refType: "mining_session",
        refId: session.id,
        actor: `user:${p.userId}`,
        entries: [
          { account: "pool_mining", amount: -reward },
          { account: userAccountCode(p.userId), amount: reward },
        ],
      });
    }

    const fractionBp = Math.floor((elapsed / sessionDurationMs(params)) * BP);
    const drops = rollOreDrops(params, rng, fractionBp);
    for (const ore of ORES) {
      const n = drops[ore];
      if (!n) continue;
      const inserted = await tx
        .insert(inventoryMovements)
        .values({ userId: p.userId, item: ore, delta: n, reason: "mining", idempotencyKey: `ore:${session.id}:${ore}` })
        .onConflictDoNothing({ target: inventoryMovements.idempotencyKey })
        .returning({ id: inventoryMovements.id });
      if (inserted.length) {
        await tx
          .insert(inventory)
          .values({ userId: p.userId, item: ore, qty: n })
          .onConflictDoUpdate({ target: [inventory.userId, inventory.item], set: { qty: sql`${inventory.qty} + ${n}` } });
      }
    }

    await tx
      .update(miningSessions)
      .set({ collectedAt: p.now, reward, oreDrops: drops })
      .where(eq(miningSessions.id, session.id));

    const cfg = await getActiveConfig(tx, p.now);
    const durability = cfg.params.pickaxeEnabled ? Math.max(0, slot.durability - 1) : slot.durability;
    const broken = cfg.params.pickaxeEnabled && durability === 0;
    await tx
      .update(slots)
      .set({ durability, state: broken ? "broken" : "idle", brokenUntil: null, updatedAt: p.now })
      .where(eq(slots.id, slot.id));

    if (exhausted) {
      await setFlag(tx, "mining_halted", { on: true, at: p.now.toISOString() }, "system");
      await recordAlert(tx, "critical", "pool_exhausted", "Mining pool is empty. Mining has been stopped globally.");
    }
    return {
      reward: reward.toString(),
      ore: drops,
      durability,
      broken,
      endedEarly: p.now.getTime() < session.endsAt.getTime(),
      poolExhausted: exhausted,
    };
  });
}

export async function upgradeSlot(db: Database, p: { userId: string; slotId: string; idempotencyKey: string; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const { slot, pass } = await lockSlot(tx, p.userId, p.slotId);
    assertPassMines(pass);
    if (slot.state === "mining") throw new GameError("SLOT_MINING", "Collect the running session before upgrading.");
    const cfg = await getActiveConfig(tx, p.now);
    const cost = upgradeCost(cfg.params, slot.level);
    if (cost === null) throw new GameError("MAX_LEVEL", "Already at the highest level.");
    await ensureUserAccount(tx, p.userId);
    const res = await postLedgerTx(tx, {
      idempotencyKey: `upgrade:${slot.id}:${p.idempotencyKey}`,
      kind: "upgrade",
      refType: "slot",
      refId: slot.id,
      actor: `user:${p.userId}`,
      memo: `level ${slot.level} → ${slot.level + 1}`,
      entries: [
        { account: userAccountCode(p.userId), amount: -BigInt(cost) },
        { account: sinkAccount(cfg.params), amount: BigInt(cost) },
      ],
    });
    if (!res.created) return { level: slot.level, durability: slot.durability, replayed: true, cost: String(cost) };
    const level = slot.level + 1;
    const durability = durabilityMax(cfg.params, level);
    await tx
      .update(slots)
      .set({ level, durability, state: "idle", brokenUntil: null, updatedAt: p.now })
      .where(eq(slots.id, slot.id));
    return { level, durability, replayed: false, cost: String(cost) };
  });
}

export async function repairSlot(db: Database, p: { userId: string; slotId: string; idempotencyKey: string; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const { slot, pass } = await lockSlot(tx, p.userId, p.slotId);
    assertPassMines(pass);
    if (slot.state !== "broken") throw new GameError("REPAIR_NOT_NEEDED", "The pickaxe does not need repairing yet.");
    if (slot.brokenUntil) {
      if (slot.brokenUntil.getTime() > p.now.getTime()) {
        throw new GameError("REPAIR_IN_PROGRESS", "Repair already paid.", { readyAt: slot.brokenUntil.toISOString() });
      }
      throw new GameError("REPAIR_NOT_NEEDED", "Repair finished. Start mining.");
    }
    const cfg = await getActiveConfig(tx, p.now);
    const cost = repairCost(cfg.params, slot.level);
    await ensureUserAccount(tx, p.userId);
    const res = await postLedgerTx(tx, {
      idempotencyKey: `repair:${slot.id}:${p.idempotencyKey}`,
      kind: "repair",
      refType: "slot",
      refId: slot.id,
      actor: `user:${p.userId}`,
      entries: [
        { account: userAccountCode(p.userId), amount: -BigInt(cost) },
        { account: sinkAccount(cfg.params), amount: BigInt(cost) },
      ],
    });
    if (!res.created) return { readyAt: slot.brokenUntil, replayed: true, cost: String(cost) };
    const readyAt = new Date(p.now.getTime() + cfg.params.repairWaitHours * HOUR_MS);
    const instant = cfg.params.repairWaitHours === 0;
    await tx
      .update(slots)
      .set({
        durability: durabilityMax(cfg.params, slot.level),
        state: instant ? "idle" : "broken",
        brokenUntil: instant ? null : readyAt,
        updatedAt: p.now,
      })
      .where(eq(slots.id, slot.id));
    return { readyAt: readyAt.toISOString(), replayed: false, cost: String(cost) };
  });
}

// ------------------------------------------------------------------ daily

export async function claimDaily(db: Database, p: { userId: string; now: Date }) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const [pass] = await tx.select().from(passes).where(eq(passes.userId, p.userId)).limit(1);
    if (!pass) throw new GameError("NO_PASS", "Daily rewards are for pass holders.");
    assertPassMines(pass);
    const cfg = await getActiveConfig(tx, p.now);
    const today = utcDay(p.now);
    const [last] = await tx
      .select()
      .from(dailyClaims)
      .where(eq(dailyClaims.userId, p.userId))
      .orderBy(desc(dailyClaims.day))
      .limit(1);
    if (last?.day === today) throw new GameError("ALREADY_CLAIMED", "Daily reward already claimed today.");
    const streak = nextStreak(cfg.params, last ? { day: last.day, streak: last.streak } : null, today);
    const amount = dailyReward(cfg.params, streak);
    const [claim] = await tx
      .insert(dailyClaims)
      .values({ userId: p.userId, day: today, streak, amount })
      .onConflictDoNothing()
      .returning();
    if (!claim) throw new GameError("ALREADY_CLAIMED", "Daily reward already claimed today.");
    await ensureUserAccount(tx, p.userId);
    await postLedgerTx(tx, {
      idempotencyKey: `daily:${p.userId}:${today}`,
      kind: "daily_reward",
      refType: "daily_claim",
      refId: `${p.userId}:${today}`,
      actor: `user:${p.userId}`,
      memo: `streak ${streak}`,
      entries: [
        { account: "pool_daily", amount: -amount },
        { account: userAccountCode(p.userId), amount },
      ],
    });
    return { amount: amount.toString(), streak, streakMax: cfg.params.dailyStreakMax };
  });
}

// ------------------------------------------------------------------ inventory & shop

export async function getInventory(db: DbOrTx, userId: string, now: Date) {
  const cfg = await getActiveConfig(db, now);
  const rows = await db.select().from(inventory).where(eq(inventory.userId, userId));
  return ORES.map((item) => ({
    item,
    qty: rows.find((r) => r.item === item)?.qty ?? 0,
    exchangeRate: String(cfg.params.oreExchange[item]),
  }));
}

export async function exchangeOre(
  db: Database,
  p: { userId: string; item: OreId; qty: number; idempotencyKey: string; now: Date },
) {
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const cfg = await getActiveConfig(tx, p.now);
    const value = oreExchangeValue(cfg.params, p.item, p.qty);
    if (value <= 0n) throw new GameError("VALIDATION", "That exchange is not available.");
    const [row] = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, p.userId), eq(inventory.item, p.item)))
      .for("update");
    const key = `exchange:${p.userId}:${p.idempotencyKey}`;
    const [done] = await tx
      .select({ id: inventoryMovements.id })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.idempotencyKey, key))
      .limit(1);
    if (done) return { item: p.item, qty: p.qty, received: value.toString(), replayed: true };
    if (!row || row.qty < p.qty) throw new GameError("INSUFFICIENT_BALANCE", "Not enough ore.");
    await ensureUserAccount(tx, p.userId);
    await postLedgerTx(tx, {
      idempotencyKey: key,
      kind: "ore_exchange",
      refType: "inventory",
      refId: p.item,
      actor: `user:${p.userId}`,
      memo: `${p.qty} × ${p.item}`,
      entries: [
        { account: "pool_mining", amount: -value },
        { account: userAccountCode(p.userId), amount: value },
      ],
    });
    await tx.insert(inventoryMovements).values({ userId: p.userId, item: p.item, delta: -p.qty, reason: "exchange", idempotencyKey: key });
    await tx
      .update(inventory)
      .set({ qty: sql`${inventory.qty} - ${p.qty}` })
      .where(and(eq(inventory.userId, p.userId), eq(inventory.item, p.item)));
    return { item: p.item, qty: p.qty, received: value.toString(), replayed: false };
  });
}

// ------------------------------------------------------------------ raffle tickets

export async function buyRaffleTickets(
  db: Database,
  p: { userId: string; raffleId: number; count: number; idempotencyKey: string; tipHeight: number | null; now: Date },
) {
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > 100) throw new GameError("VALIDATION", "Buy 1–100 tickets at a time.");
  return db.transaction(async (tx) => {
    await loadActiveUser(tx, p.userId);
    const [pass] = await tx.select().from(passes).where(eq(passes.userId, p.userId)).limit(1);
    if (!pass) throw new GameError("NO_PASS", "Raffles are for pass holders.");
    const [raffle] = await tx.select().from(raffles).where(eq(raffles.id, p.raffleId)).limit(1).for("update");
    if (!raffle) throw new GameError("NOT_FOUND", "Raffle not found.");
    if (raffle.status !== "open") throw new GameError("RAFFLE_CLOSED", "Ticket sales have closed.");
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
