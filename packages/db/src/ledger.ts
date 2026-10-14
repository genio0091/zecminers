import { TOTAL_SUPPLY, POOL_ALLOCATION } from "@hoodvalley/economy";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { DbOrTx, Tx } from "./client";
import { GameError } from "./errors";
import { ledgerAccounts, ledgerEntries, ledgerTransactions, type AccountType } from "./schema";

export const SYSTEM_ACCOUNTS = [
  "pool_mining",
  "pool_liquidity",
  "pool_community",
  "pool_presale_lp",
  "pool_team",
  "sink_burned",
  "payout_pending",
  "treasury_backing",
] as const satisfies readonly AccountType[];
export type SystemAccount = (typeof SYSTEM_ACCOUNTS)[number];

export const userAccountCode = (userId: string) => `user:${userId}`;

export interface LedgerEntryInput {
  /** Account code: a system account name or `user:<uuid>`. */
  account: string;
  amount: bigint;
}

export interface PostLedgerTxInput {
  idempotencyKey: string;
  kind: string;
  refType?: string;
  refId?: string;
  actor: string;
  memo?: string;
  entries: LedgerEntryInput[];
}

export interface PostLedgerTxResult {
  txId: number;
  /** false when the idempotency key already existed and nothing was written. */
  created: boolean;
}

export async function ensureSystemAccounts(tx: DbOrTx) {
  await tx
    .insert(ledgerAccounts)
    .values(SYSTEM_ACCOUNTS.map((code) => ({ code, type: code })))
    .onConflictDoNothing({ target: ledgerAccounts.code });
}

export async function ensureUserAccount(tx: DbOrTx, userId: string): Promise<void> {
  await tx
    .insert(ledgerAccounts)
    .values({ code: userAccountCode(userId), type: "user", userId })
    .onConflictDoNothing({ target: ledgerAccounts.code });
}

/**
 * The only function allowed to change a balance (blueprint §8.3). Must run inside a
 * database transaction; callers compose it with their own row locks.
 *  1. lock every touched account, ordered by id (no deadlocks)
 *  2. return the earlier result if the idempotency key exists
 *  3. reject if entries don't sum to zero or a non-backing account would go negative
 *  4. insert transaction + entries, update the cached balances
 */
export async function postLedgerTx(tx: Tx, input: PostLedgerTxInput): Promise<PostLedgerTxResult> {
  if (input.entries.length < 2) throw new GameError("LEDGER_UNBALANCED", "a ledger tx needs at least two entries");
  let sum = 0n;
  for (const e of input.entries) {
    if (e.amount === 0n) throw new GameError("LEDGER_UNBALANCED", "zero-amount entry");
    sum += e.amount;
  }
  if (sum !== 0n) throw new GameError("LEDGER_UNBALANCED", `entries sum to ${sum}, not 0`);

  const codes = [...new Set(input.entries.map((e) => e.account))];
  const found = await tx
    .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
    .from(ledgerAccounts)
    .where(inArray(ledgerAccounts.code, codes));
  if (found.length !== codes.length) {
    const missing = codes.filter((c) => !found.some((f) => f.code === c));
    throw new GameError("INTERNAL", `unknown ledger account(s): ${missing.join(", ")}`);
  }
  const locked = await tx
    .select()
    .from(ledgerAccounts)
    .where(
      inArray(
        ledgerAccounts.id,
        found.map((f) => f.id),
      ),
    )
    .orderBy(ledgerAccounts.id)
    .for("update");

  const existing = await tx
    .select({ id: ledgerTransactions.id })
    .from(ledgerTransactions)
    .where(eq(ledgerTransactions.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return { txId: existing[0].id, created: false };

  const byCode = new Map(locked.map((a) => [a.code, a]));
  const delta = new Map<string, bigint>();
  for (const e of input.entries) delta.set(e.account, (delta.get(e.account) ?? 0n) + e.amount);
  for (const [code, d] of delta) {
    const acct = byCode.get(code)!;
    const next = BigInt(acct.balance) + d;
    if (next < 0n && acct.type !== "treasury_backing") {
      const pool = acct.type.startsWith("pool_");
      throw new GameError(pool ? "POOL_EXHAUSTED" : "INSUFFICIENT_BALANCE", pool ? "This reward pool is empty (it is funded once at genesis)." : "Not enough $VALLEY.", {
        account: code,
        balance: String(acct.balance),
        needed: String(-d),
      });
    }
  }

  const [row] = await tx
    .insert(ledgerTransactions)
    .values({
      idempotencyKey: input.idempotencyKey,
      kind: input.kind,
      refType: input.refType,
      refId: input.refId,
      actor: input.actor,
      memo: input.memo,
    })
    .returning({ id: ledgerTransactions.id });
  const txId = row!.id;

  await tx.insert(ledgerEntries).values(
    input.entries.map((e) => ({
      txId,
      accountId: byCode.get(e.account)!.id,
      amount: e.amount,
    })),
  );
  for (const [code, d] of delta) {
    if (d === 0n) continue;
    await tx
      .update(ledgerAccounts)
      .set({ balance: sql`${ledgerAccounts.balance} + ${d.toString()}::bigint`, updatedAt: new Date() })
      .where(eq(ledgerAccounts.id, byCode.get(code)!.id));
  }
  return { txId, created: true };
}

export async function accountBalance(db: DbOrTx, code: string): Promise<bigint> {
  const [row] = await db
    .select({ balance: ledgerAccounts.balance })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.code, code))
    .limit(1);
  return row ? BigInt(row.balance) : 0n;
}

export async function systemBalances(db: DbOrTx): Promise<Record<SystemAccount, bigint>> {
  const rows = await db
    .select({ code: ledgerAccounts.code, balance: ledgerAccounts.balance })
    .from(ledgerAccounts)
    .where(inArray(ledgerAccounts.code, [...SYSTEM_ACCOUNTS]));
  const out = Object.fromEntries(SYSTEM_ACCOUNTS.map((c) => [c, 0n])) as Record<SystemAccount, bigint>;
  for (const r of rows) out[r.code as SystemAccount] = BigInt(r.balance);
  return out;
}

export async function totalUserBalances(db: DbOrTx): Promise<bigint> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${ledgerAccounts.balance}), 0)` })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.type, "user"));
  return BigInt(row?.total ?? "0");
}

/** Genesis transaction: the five pools +10B (70/15/8/5/2), treasury_backing −10B. */
export async function postGenesis(tx: Tx, actor = "genesis") {
  await ensureSystemAccounts(tx);
  const poolTotal = Object.values(POOL_ALLOCATION).reduce((a, b) => a + b, 0n);
  if (poolTotal !== TOTAL_SUPPLY) throw new Error("pool allocation does not add up to total supply");
  return postLedgerTx(tx, {
    idempotencyKey: "genesis",
    kind: "genesis",
    actor,
    memo: "Phase 0 verified: full supply backed by the on-chain treasury",
    entries: [
      ...Object.entries(POOL_ALLOCATION).map(([account, amount]) => ({ account, amount })),
      { account: "treasury_backing", amount: -TOTAL_SUPPLY },
    ],
  });
}

/** The pre-Hood Valley genesis split (80/10/5/5). */
const LEGACY_ALLOCATION: Record<string, bigint> = {
  pool_mining: 8_000_000_000n,
  pool_daily: 1_000_000_000n,
  pool_marketing: 500_000_000n,
  pool_liquidity: 500_000_000n,
};

/**
 * A genesis posted before Hood Valley funded the old 80/10/5/5 pools. This moves them into the
 * 70/15/8/5/2 split in one ledger transaction. Whatever an old pool already paid out counts
 * against its successor: mining → mining, daily rewards + marketing → community, liquidity →
 * liquidity. Returns "blocked" (and moves nothing) if a successor pool would go below zero.
 */
export async function reallocateLegacyPools(tx: Tx, actor: string): Promise<"done" | "not_needed" | "blocked"> {
  const codes = [...new Set([...Object.keys(LEGACY_ALLOCATION), ...Object.keys(POOL_ALLOCATION)])];
  const rows = await tx
    .select({ code: ledgerAccounts.code, balance: ledgerAccounts.balance })
    .from(ledgerAccounts)
    .where(inArray(ledgerAccounts.code, codes));
  const bal = (code: string) => BigInt(rows.find((r) => r.code === code)?.balance ?? 0);
  if (bal("pool_daily") === 0n && bal("pool_marketing") === 0n) return "not_needed";
  const used = (code: string) => LEGACY_ALLOCATION[code]! - bal(code);
  const target: Record<string, bigint> = {
    pool_daily: 0n,
    pool_marketing: 0n,
    pool_mining: POOL_ALLOCATION.pool_mining - used("pool_mining"),
    pool_liquidity: POOL_ALLOCATION.pool_liquidity - used("pool_liquidity"),
    pool_community: POOL_ALLOCATION.pool_community - used("pool_daily") - used("pool_marketing"),
    pool_presale_lp: POOL_ALLOCATION.pool_presale_lp,
    pool_team: POOL_ALLOCATION.pool_team,
  };
  const fresh = ["pool_community", "pool_presale_lp", "pool_team"].every((code) => bal(code) === 0n);
  const sane = Object.keys(LEGACY_ALLOCATION).every((code) => used(code) >= 0n);
  if (!fresh || !sane || Object.values(target).some((v) => v < 0n)) return "blocked";
  await ensureSystemAccounts(tx);
  const entries = codes.map((account) => ({ account, amount: target[account]! - bal(account) })).filter((e) => e.amount !== 0n);
  await postLedgerTx(tx, {
    idempotencyKey: "reallocate:hood-valley",
    kind: "pool_reallocation",
    actor,
    memo: "Hood Valley tokenomics: 80/10/5/5 → 70/15/8/5/2",
    entries,
  });
  return "done";
}

export interface LedgerHistoryRow {
  entryId: number;
  txId: number;
  kind: string;
  amount: string;
  memo: string | null;
  createdAt: Date;
}

/** Cursor-paginated history for one account, newest first. */
export async function accountHistory(
  db: DbOrTx,
  code: string,
  opts: { cursor?: number; limit?: number } = {},
): Promise<{ rows: LedgerHistoryRow[]; nextCursor: number | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const [acct] = await db.select({ id: ledgerAccounts.id }).from(ledgerAccounts).where(eq(ledgerAccounts.code, code));
  if (!acct) return { rows: [], nextCursor: null };
  const rows = await db
    .select({
      entryId: ledgerEntries.id,
      txId: ledgerEntries.txId,
      kind: ledgerTransactions.kind,
      amount: ledgerEntries.amount,
      memo: ledgerTransactions.memo,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, ledgerEntries.txId))
    .where(
      opts.cursor
        ? and(eq(ledgerEntries.accountId, acct.id), lt(ledgerEntries.id, opts.cursor))
        : eq(ledgerEntries.accountId, acct.id),
    )
    .orderBy(desc(ledgerEntries.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map((r) => ({ ...r, amount: String(r.amount) }));
  return { rows: page, nextCursor: rows.length > limit ? page[page.length - 1]!.entryId : null };
}
