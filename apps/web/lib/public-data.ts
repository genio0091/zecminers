import "server-only";
import { NFT_MINERS_SUPPLY, POOL_ALLOCATION, POOL_LABELS, SEASON_1, SEASON_1_DAILY_POOL, TICKER, TOTAL_SUPPLY } from "@hoodvalley/economy";
import { getRegistry, latestSnapshot, poolBalances, settledPayoutTotal } from "@hoodvalley/db";
import { cachedChainRead, chain } from "./chain";

export interface PublicReserves {
  genesisPublished: boolean;
  token: {
    tick: string;
    standard: "ZRC-20";
    network: "Zcash mainnet" | "Zcash testnet";
    totalSupply: string;
    indexer: string;
  };
  registry: Record<string, string>;
  treasury: { address: string | null; hotWallet: string | null; onchain: string | null; readAt: string | null; error: string | null };
  paidOut: string;
  pools: { code: string; label: string; ceiling: string; left: string }[];
  sinkBurned: string;
  payoutPending: string;
  snapshot: { takenAt: string; ok: boolean; invariants: { name: string; ok: boolean | null; detail: string }[] } | null;
}

export async function publicReserves(): Promise<PublicReserves> {
  const { db, indexer } = chain();
  const [reg, snap, pools, settled] = await Promise.all([getRegistry(db), latestSnapshot(db), poolBalances(db), settledPayoutTotal(db)]);
  const tick = reg.token_tick ?? TICKER;
  let onchain: string | null = null;
  let readAt: string | null = null;
  let error: string | null = null;
  if (reg.treasury_address) {
    try {
      const r = await cachedChainRead(`treasury:${reg.treasury_address}:${reg.hot_wallet_address ?? ""}`, 5 * 60_000, async () => {
        let sum = await indexer.balance(reg.treasury_address!, tick);
        if (reg.hot_wallet_address) sum += await indexer.balance(reg.hot_wallet_address, tick);
        return { value: sum.toString(), at: new Date().toISOString() };
      });
      onchain = r.value;
      readAt = r.at;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const genesisPublished = !!reg.treasury_address && (pools.pool_mining ?? 0n) > 0n;
  return {
    genesisPublished,
    token: {
      tick,
      standard: "ZRC-20",
      network: process.env.ZCASH_NETWORK === "testnet" ? "Zcash testnet" : "Zcash mainnet",
      totalSupply: TOTAL_SUPPLY.toString(),
      indexer: "Zord, self-hosted on our own Zebra node",
    },
    registry: reg as Record<string, string>,
    treasury: { address: reg.treasury_address ?? null, hotWallet: reg.hot_wallet_address ?? null, onchain, readAt, error },
    paidOut: settled.toString(),
    pools: (Object.keys(POOL_ALLOCATION) as (keyof typeof POOL_ALLOCATION)[]).map((code) => ({
      code,
      label: POOL_LABELS[code],
      ceiling: POOL_ALLOCATION[code].toString(),
      left: (pools[code] ?? 0n).toString(),
    })),
    sinkBurned: (pools.sink_burned ?? 0n).toString(),
    payoutPending: (pools.payout_pending ?? 0n).toString(),
    snapshot: snap
      ? { takenAt: snap.takenAt.toISOString(), ok: snap.invariantsOk, invariants: snap.invariants }
      : null,
  };
}

export async function publicTokenFacts() {
  const { db } = chain();
  const reg = await getRegistry(db);
  return {
    tick: reg.token_tick ?? TICKER,
    standard: "ZRC-20",
    network: process.env.ZCASH_NETWORK === "testnet" ? "Zcash testnet" : "Zcash mainnet",
    totalSupply: TOTAL_SUPPLY.toString(),
    decimals: 0,
    mintedTo: "project treasury, in a single mint at genesis",
    allocation: Object.fromEntries(Object.entries(POOL_ALLOCATION).map(([k, v]) => [k, { amount: v.toString(), label: POOL_LABELS[k as keyof typeof POOL_LABELS] }])),
    season1: { pool: SEASON_1.pool.toString(), days: SEASON_1.days, dailyPool: SEASON_1_DAILY_POOL },
    liquidity: "15% protocol liquidity for DEX pairing; 5% paired with presale funds to seed the initial DEX liquidity",
    officialIndexer: "Zord (self-hosted)",
    nftMiners: NFT_MINERS_SUPPLY,
    genesis: {
      deployTxid: reg.token_deploy_txid ?? null,
      mintTxid: reg.token_mint_txid ?? null,
      inscriptionId: reg.token_inscription_id ?? null,
      deployHeight: reg.token_deploy_height ?? null,
      treasuryAddress: reg.treasury_address ?? null,
    },
    passCollection: {
      name: reg.pass_collection ?? null,
      standard: "ZRC-721",
      inscriptionId: reg.pass_collection_inscription_id ?? null,
      deployTxid: reg.pass_collection_deploy_txid ?? null,
      supply: reg.pass_supply ?? null,
      soulbound: "By rule: a pass only mines at the address it was registered to",
    },
    explorerBaseUrl: reg.explorer_base_url ?? null,
  };
}
