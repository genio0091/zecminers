import { TOTAL_SUPPLY, TICKER } from "@zecminers/economy";
import type { ChainIndexer } from "@zecminers/zord-client";
import { desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "./client";
import { ledgerAccounts, ledgerEntries, payoutItems, porSnapshots, type InvariantResult } from "./schema";
import { getRegistry } from "./system";

export async function settledPayoutTotal(db: DbOrTx): Promise<bigint> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${payoutItems.amount}), 0)` })
    .from(payoutItems)
    .where(eq(payoutItems.status, "settled"));
  return BigInt(row?.total ?? "0");
}

/** Tokens whose transfer UTXO has been broadcast but not yet settled in the ledger. */
export async function inFlightPayoutTotal(db: DbOrTx): Promise<bigint> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${payoutItems.amount}), 0)` })
    .from(payoutItems)
    .where(eq(payoutItems.status, "sent"));
  return BigInt(row?.total ?? "0");
}

export async function ledgerTotalsByType(db: DbOrTx): Promise<Record<string, string>> {
  const rows = await db
    .select({ type: ledgerAccounts.type, total: sql<string>`sum(${ledgerAccounts.balance})` })
    .from(ledgerAccounts)
    .groupBy(ledgerAccounts.type);
  return Object.fromEntries(rows.map((r) => [r.type, String(r.total)]));
}

/** Invariant 1: every account except treasury_backing sums to 10B − settled payouts. */
export async function checkSupplyInvariant(db: DbOrTx, settled: bigint): Promise<InvariantResult> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${ledgerAccounts.balance}), 0)` })
    .from(ledgerAccounts)
    .where(ne(ledgerAccounts.type, "treasury_backing"));
  const total = BigInt(row?.total ?? "0");
  const expected = TOTAL_SUPPLY - settled;
  const genesisDone = total !== 0n;
  return {
    name: "ledger_matches_supply",
    ok: genesisDone ? total === expected : null,
    detail: genesisDone
      ? `ledger ${total} vs expected ${expected} (10B − ${settled} settled)`
      : "genesis ledger transaction not posted yet",
  };
}

/** Invariant: every ledger transaction sums to zero. */
export async function checkZeroSum(db: DbOrTx): Promise<InvariantResult> {
  const bad = await db
    .select({ txId: ledgerEntries.txId })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.txId)
    .having(sql`sum(${ledgerEntries.amount}) <> 0`)
    .limit(5);
  return {
    name: "transactions_sum_to_zero",
    ok: bad.length === 0,
    detail: bad.length ? `unbalanced tx: ${bad.map((b) => b.txId).join(", ")}` : "all transactions balance",
  };
}

/** Invariant: no negative balance outside treasury_backing. */
export async function checkNoNegative(db: DbOrTx): Promise<InvariantResult> {
  const bad = await db
    .select({ code: ledgerAccounts.code })
    .from(ledgerAccounts)
    .where(sql`${ledgerAccounts.balance} < 0 and ${ledgerAccounts.type} <> 'treasury_backing'`)
    .limit(5);
  return {
    name: "no_negative_balances",
    ok: bad.length === 0,
    detail: bad.length ? `negative: ${bad.map((b) => b.code).join(", ")}` : "no negative balances",
  };
}

/** Hourly: cached balance = SUM(entries) per account. */
export async function checkBalanceCache(db: DbOrTx): Promise<InvariantResult & { drifted: number[] }> {
  const rows = await db.execute<{ id: number }>(sql`
    select a.id from ${ledgerAccounts} a
    left join (select account_id, sum(amount) s from ${ledgerEntries} group by account_id) e on e.account_id = a.id
    where a.balance <> coalesce(e.s, 0)
    limit 50`);
  const drifted = rows.rows.map((r) => Number(r.id));
  return {
    name: "balance_cache_matches_entries",
    ok: drifted.length === 0,
    detail: drifted.length ? `${drifted.length} account(s) drifted` : "cache matches entries",
    drifted,
  };
}

/** Recompute cached balances from entries for the given accounts. */
export async function rebuildBalanceCache(db: DbOrTx, accountIds: number[]) {
  if (!accountIds.length) return;
  await db.execute(sql`
    update ${ledgerAccounts} a set balance = coalesce((select sum(amount) from ${ledgerEntries} e where e.account_id = a.id), 0)
    where a.id in ${sql.raw(`(${accountIds.map((n) => Number(n)).join(",")})`)}`);
}

/**
 * Invariant 2: treasury + hot wallet on-chain (Zord) = 10B − settled payouts.
 * Transfers already broadcast but not settled may have left the hot wallet, so the
 * on-chain figure may be lower by at most the in-flight total.
 */
export async function checkOnchainTreasury(
  db: DbOrTx,
  indexer: ChainIndexer,
  settled: bigint,
): Promise<{ result: InvariantResult; onchain: bigint | null }> {
  const reg = await getRegistry(db);
  if (!reg.treasury_address) {
    return {
      result: { name: "onchain_treasury_matches", ok: null, detail: "treasury address published at genesis" },
      onchain: null,
    };
  }
  const tick = reg.token_tick ?? TICKER;
  const addresses = [reg.treasury_address, reg.hot_wallet_address].filter((a): a is string => !!a);
  let onchain = 0n;
  for (const a of addresses) onchain += await indexer.balance(a, tick);
  const expected = TOTAL_SUPPLY - settled;
  const inFlight = await inFlightPayoutTotal(db);
  const ok = onchain <= expected && onchain >= expected - inFlight;
  return {
    result: {
      name: "onchain_treasury_matches",
      ok,
      detail: `on-chain ${onchain} vs expected ${expected}${inFlight ? ` (−${inFlight} in flight allowed)` : ""}`,
    },
    onchain,
  };
}

export interface ReserveCheck {
  ok: boolean;
  invariants: InvariantResult[];
  onchain: bigint | null;
  settled: bigint;
  ledgerTotals: Record<string, string>;
}

/** Runs the reserve checks and stores a proof-of-reserves snapshot (blueprint §8.4). */
export async function runReserveChecks(db: DbOrTx, indexer: ChainIndexer | null): Promise<ReserveCheck> {
  const settled = await settledPayoutTotal(db);
  const invariants: InvariantResult[] = [
    await checkSupplyInvariant(db, settled),
    await checkZeroSum(db),
    await checkNoNegative(db),
  ];
  let onchain: bigint | null = null;
  if (indexer) {
    try {
      const r = await checkOnchainTreasury(db, indexer, settled);
      invariants.push(r.result);
      onchain = r.onchain;
    } catch (err) {
      invariants.push({ name: "onchain_treasury_matches", ok: false, detail: `indexer error: ${(err as Error).message}` });
    }
  }
  const ok = invariants.every((i) => i.ok !== false);
  const ledgerTotals = await ledgerTotalsByType(db);
  await db.insert(porSnapshots).values({
    onchainTreasury: onchain,
    paidOutTotal: settled,
    ledgerTotals,
    invariants,
    invariantsOk: ok,
  });
  return { ok, invariants, onchain, settled, ledgerTotals };
}

export async function latestSnapshot(db: DbOrTx) {
  const [row] = await db.select().from(porSnapshots).orderBy(desc(porSnapshots.takenAt)).limit(1);
  return row ?? null;
}

export async function poolBalances(db: DbOrTx) {
  const rows = await db
    .select({ code: ledgerAccounts.code, balance: ledgerAccounts.balance })
    .from(ledgerAccounts)
    .where(inArray(ledgerAccounts.code, ["pool_mining", "pool_daily", "pool_marketing", "pool_liquidity", "sink_burned", "payout_pending"]));
  return Object.fromEntries(rows.map((r) => [r.code, BigInt(r.balance)])) as Record<string, bigint>;
}
