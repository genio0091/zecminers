/**
 * Hood Valley tokenomics (litepaper §06–07). $VALLEY has a fixed supply and no decimals,
 * so every amount is an integer number of $VALLEY.
 */
export const TICKER = "VALLEY";
export const TOTAL_SUPPLY = 10_000_000_000n;

export const POOL_ALLOCATION = {
  pool_mining: 7_000_000_000n, // 70% — Season 1 in-game mining, ~38.88M a day for 180 days
  pool_liquidity: 1_500_000_000n, // 15% — DEX pairing, pool depth, market stability
  pool_community: 800_000_000n, // 8% — holder raffles, streak incentives, airdrops
  pool_presale_lp: 500_000_000n, // 5% — paired with presale funds to seed the initial DEX liquidity
  pool_team: 200_000_000n, // 2% — long-term development and maintenance
} as const;

export type PoolCode = keyof typeof POOL_ALLOCATION;

export const POOL_LABELS: Record<PoolCode, string> = {
  pool_mining: "In-Game Mining",
  pool_liquidity: "Protocol Liquidity",
  pool_community: "Community Raffles & Holder Benefits",
  pool_presale_lp: "Presale LP Backing",
  pool_team: "Core Team",
};

/** Share of total supply in whole percent, for labels. */
export const POOL_SHARE_PCT: Record<PoolCode, number> = {
  pool_mining: 70,
  pool_liquidity: 15,
  pool_community: 8,
  pool_presale_lp: 5,
  pool_team: 2,
};

/** Season 1: the 70% mining pool, planned over 180 days. It ends when the pool is mined out. */
export const SEASON_1 = {
  number: 1,
  days: 180,
  pool: POOL_ALLOCATION.pool_mining,
} as const;

/** ~38,888,889 $VALLEY: the Season 1 pool spread evenly over 180 days, rounded up. */
export const SEASON_1_DAILY_POOL = 38_888_889;

/** The Valley Miners collection: each Miner is one worker license. */
export const NFT_MINERS_SUPPLY = 3_333;

export const BP = 10_000; // basis points: 10_000 = 1.00×
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
