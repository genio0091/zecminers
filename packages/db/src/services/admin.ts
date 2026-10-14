import { runwayDays, TOTAL_SUPPLY } from "@hoodvalley/economy";
import { and, desc, eq, gte, ilike, isNotNull, or, sql } from "drizzle-orm";
import type { Database, DbOrTx } from "../client";
import { GameError } from "../errors";
import { latestSnapshot, poolBalances } from "../invariants";
import { accountBalance, accountHistory, ensureUserAccount, postGenesis, postLedgerTx, reallocateLegacyPools, userAccountCode } from "../ledger";
import { miningSessions, passes, slots, users } from "../schema";
import {
  audit,
  getActiveConfig,
  getMaintenance,
  getRegistry,
  isMiningHalted,
  publishConfig,
  recentAlerts,
  recentAudit,
  setFlag,
  setMaintenance,
  setRegistry,
  REGISTRY_KEYS,
  type RegistryKey,
} from "../system";
import { shiftStats } from "./game";
import { batchOverview, listBatches } from "./payouts";

function requireReason(reason: string | undefined): string {
  const r = (reason ?? "").trim();
  if (r.length < 3) throw new GameError("VALIDATION", "Every admin action needs a reason.");
  return r;
}

/** Grant from the community pool (8%: holder benefits, airdrops): admin only, always audited. */
export async function grantFromCommunity(db: Database, p: { adminId: string; userId: string; amount: bigint; reason: string; idempotencyKey: string }) {
  const reason = requireReason(p.reason);
  if (p.amount <= 0n) throw new GameError("VALIDATION", "Amount must be positive.");
  return db.transaction(async (tx) => {
    const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.id, p.userId));
    if (!u) throw new GameError("NOT_FOUND", "User not found.");
    await ensureUserAccount(tx, p.userId);
    await audit(tx, { adminId: p.adminId, action: "grant.community", payload: { userId: p.userId, amount: p.amount.toString() }, reason });
    const res = await postLedgerTx(tx, {
      idempotencyKey: `grant:${p.idempotencyKey}`,
      kind: "community_grant",
      refType: "user",
      refId: p.userId,
      actor: `admin:${p.adminId}`,
      memo: reason,
      entries: [
        { account: "pool_community", amount: -p.amount },
        { account: userAccountCode(p.userId), amount: p.amount },
      ],
    });
    return { txId: res.txId, replayed: !res.created };
  });
}

export async function freezeUser(db: Database, p: { adminId: string; userId: string; frozen: boolean; reason: string }) {
  const reason = requireReason(p.reason);
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, p.userId)).for("update");
    if (!u) throw new GameError("NOT_FOUND", "User not found.");
    await audit(tx, { adminId: p.adminId, action: p.frozen ? "user.freeze" : "user.unfreeze", payload: { userId: p.userId }, reason });
    await tx
      .update(users)
      .set({ status: p.frozen ? "frozen" : "active", frozenReason: p.frozen ? reason : null })
      .where(eq(users.id, p.userId));
    return { userId: p.userId, status: p.frozen ? "frozen" : "active" };
  });
}

export async function toggleMaintenance(db: Database, p: { adminId: string; on: boolean; reason: string }) {
  const reason = requireReason(p.reason);
  await db.transaction(async (tx) => {
    await audit(tx, { adminId: p.adminId, action: p.on ? "maintenance.on" : "maintenance.off", payload: {}, reason });
    await setMaintenance(tx, p.on, reason, `admin:${p.adminId}`);
  });
  return getMaintenance(db);
}

export async function setMiningHalted(db: Database, p: { adminId: string; on: boolean; reason: string }) {
  const reason = requireReason(p.reason);
  await db.transaction(async (tx) => {
    await audit(tx, { adminId: p.adminId, action: p.on ? "mining.halt" : "mining.resume", payload: {}, reason });
    await setFlag(tx, "mining_halted", { on: p.on, at: new Date().toISOString() }, `admin:${p.adminId}`);
  });
  return { on: p.on };
}

export async function publishEconomyConfig(db: Database, p: { adminId: string; params: unknown; activeFrom?: Date; reason: string }) {
  const reason = requireReason(p.reason);
  return db.transaction(async (tx) => {
    const version = await publishConfig(tx, p.params, { activeFrom: p.activeFrom, createdBy: `admin:${p.adminId}`, note: reason });
    await audit(tx, { adminId: p.adminId, action: `config.publish v${version}`, payload: { version, activeFrom: p.activeFrom?.toISOString() ?? null }, reason });
    return { version };
  });
}

/**
 * Record Phase 0 on-chain facts and, once, post the genesis ledger transaction.
 * Only do this after the §6.4 checks pass in Zord.
 */
export async function recordGenesis(
  db: Database,
  p: { adminId: string; entries: Partial<Record<RegistryKey, string>>; postLedgerGenesis: boolean; reason: string },
) {
  const reason = requireReason(p.reason);
  return db.transaction(async (tx) => {
    for (const [k, v] of Object.entries(p.entries)) {
      if (!REGISTRY_KEYS.includes(k as RegistryKey)) throw new GameError("VALIDATION", `unknown registry key ${k}`);
      if (typeof v === "string" && v.trim()) await setRegistry(tx, k as RegistryKey, v.trim());
    }
    let genesis: { txId: number; created: boolean } | null = null;
    let reallocation: Awaited<ReturnType<typeof reallocateLegacyPools>> | null = null;
    if (p.postLedgerGenesis) {
      genesis = await postGenesis(tx, `admin:${p.adminId}`);
      reallocation = await reallocateLegacyPools(tx, `admin:${p.adminId}`);
    }
    await audit(tx, { adminId: p.adminId, action: "genesis.record", payload: { keys: Object.keys(p.entries), ledger: genesis, reallocation }, reason });
    return { registry: await getRegistry(tx), genesis, reallocation };
  });
}

export async function searchUsers(db: DbOrTx, q: string, limit = 20) {
  const term = `%${q.trim()}%`;
  const rows = await db
    .select({
      id: users.id,
      discordId: users.discordId,
      discordUsername: users.discordUsername,
      status: users.status,
      role: users.role,
      walletAddress: users.walletAddress,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      q.trim()
        ? or(ilike(users.discordUsername, term), ilike(users.walletAddress, term), ilike(users.discordId, term), sql`${users.id}::text = ${q.trim()}`)
        : undefined,
    )
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return Promise.all(
    rows.map(async (r) => ({ ...r, createdAt: r.createdAt.toISOString(), balance: (await accountBalance(db, userAccountCode(r.id))).toString() })),
  );
}

export async function userDetail(db: DbOrTx, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new GameError("NOT_FOUND", "User not found.");
  const [pass] = await db.select().from(passes).where(eq(passes.userId, userId));
  const userSlots = await db.select().from(slots).where(eq(slots.userId, userId));
  const history = await accountHistory(db, userAccountCode(userId), { limit: 50 });
  return {
    user: { ...u, createdAt: u.createdAt.toISOString() },
    pass: pass ?? null,
    slots: userSlots,
    balance: (await accountBalance(db, userAccountCode(userId))).toString(),
    ledger: history.rows,
  };
}

export async function listPasses(db: DbOrTx, limit = 50) {
  return db
    .select({
      id: passes.id,
      passNumber: passes.passNumber,
      originAddress: passes.originAddress,
      inscriptionId: passes.inscriptionId,
      status: passes.status,
      statusReason: passes.statusReason,
      userId: passes.userId,
      lastOwnerCheckAt: passes.lastOwnerCheckAt,
      isTest: passes.isTest,
    })
    .from(passes)
    .orderBy(desc(passes.passNumber))
    .limit(limit);
}

/** Admin dashboard: pools, Season 1 runway, batch, invariants, alerts, audit. */
export async function adminOverview(db: DbOrTx, now: Date) {
  const cfg = await getActiveConfig(db, now);
  const pools = await poolBalances(db);
  const [active] = await db
    .select({ n: sql<number>`count(*)` })
    .from(slots)
    .innerJoin(passes, eq(passes.id, slots.passId))
    .where(eq(passes.status, "active"));
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const [avg] = await db
    .select({
      total: sql<string>`coalesce(sum(${miningSessions.reward}), 0)`,
      days: sql<number>`count(distinct ${miningSessions.day})`,
    })
    .from(miningSessions)
    .where(and(gte(miningSessions.startedAt, since), isNotNull(miningSessions.collectedAt)));
  const activeSlots = Number(active?.n ?? 0);
  const observed = Number(avg?.days ?? 0) > 0 ? BigInt(avg!.total) / BigInt(avg!.days) : 0n;
  const shifts = await shiftStats(db, now);
  const snapshot = await latestSnapshot(db);
  const passCounts = await db
    .select({ status: passes.status, n: sql<number>`count(*)` })
    .from(passes)
    .groupBy(passes.status);
  return {
    serverTime: now.toISOString(),
    config: { version: cfg.version, activeFrom: cfg.activeFrom.toISOString(), params: cfg.params },
    pools: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.toString()])),
    totalSupply: TOTAL_SUPPLY.toString(),
    runway: {
      days: runwayDays(pools.pool_mining ?? 0n, cfg.params.dailyPool),
      activeMiners: activeSlots,
      claimedPerShift: observed.toString(),
      dailyPool: String(cfg.params.dailyPool),
      basis: "Season 1 pool left ÷ daily pool",
    },
    shifts,
    passes: Object.fromEntries(passCounts.map((p) => [p.status, Number(p.n)])),
    batch: await batchOverview(db),
    batches: await listBatches(db, 8),
    snapshot: snapshot
      ? { takenAt: snapshot.takenAt.toISOString(), ok: snapshot.invariantsOk, invariants: snapshot.invariants }
      : null,
    maintenance: await getMaintenance(db),
    miningHalted: await isMiningHalted(db),
    registry: await getRegistry(db),
    alerts: (await recentAlerts(db, 15)).map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    audit: (await recentAudit(db, 20)).map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  };
}
