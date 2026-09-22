/**
 * Genesis constants (blueprint §1, §4.1, §6.2).
 * ZRC-20 has no decimals, so every amount is an integer number of $ZGEMS.
 */
export const TICKER = "ZGEMS";
export const TOTAL_SUPPLY = 10_000_000_000n;

export const POOL_ALLOCATION = {
  pool_mining: 8_000_000_000n, // 80%
  pool_daily: 1_000_000_000n, // 10%
  pool_marketing: 500_000_000n, // 5% — admin grants only, audited
  pool_liquidity: 500_000_000n, // 5% — locked until official trading
} as const;

export type PoolCode = keyof typeof POOL_ALLOCATION;

export const POOL_LABELS: Record<PoolCode, string> = {
  pool_mining: "In-game mining",
  pool_daily: "Daily rewards",
  pool_marketing: "Marketing",
  pool_liquidity: "Liquidity (locked)",
};

/** Public wording approved by the owner (blueprint §4.5). Never write "can't be traded". */
export const TRADING_STATEMENT =
  "No liquidity pool at launch. Official trading starts after the NFT mint.";

export const ORES = ["goldstone", "grapestone", "mint_stone"] as const;
export type OreId = (typeof ORES)[number];

export const ORE_LABELS: Record<OreId, string> = {
  goldstone: "Goldstone",
  grapestone: "Grapestone",
  mint_stone: "Mint Stone",
};

export const MAX_LEVEL = 5;
export const BP = 10_000; // basis points: 10_000 = 1.00×
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const NFT_MINERS_SUPPLY = 5_555;
