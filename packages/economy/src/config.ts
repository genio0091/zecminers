import { z } from "zod";
import { MAX_LEVEL } from "./constants";

const perLevel = z.array(z.number().int().positive()).length(MAX_LEVEL);
const oreRecord = z.object({
  goldstone: z.number().int().min(0),
  grapestone: z.number().int().min(0),
  mint_stone: z.number().int().min(0),
});

/**
 * Economy parameters, stored as a versioned row in `economy_config` (blueprint §7.4).
 * Everything is an integer; multipliers and probabilities are basis points.
 * A change applies from the next session because each session records its config version.
 */
export const economyParamsSchema = z.object({
  sessionHours: z.number().int().min(1).max(24),
  baseRatePerHour: z.number().int().min(0).max(1_000_000),
  /** Index 0 = level 1. 10_000 = 1.00× */
  levelMultiplierBp: perLevel,
  /** Cost to go from level n to n+1, n = 1..4 */
  upgradeCost: z.array(z.number().int().min(0)).length(MAX_LEVEL - 1),
  /** Sessions per pickaxe, index 0 = level 1 */
  durabilityMax: perLevel,
  /** Decision #14: pickaxe mechanic can be switched off without a deploy. */
  pickaxeEnabled: z.boolean(),
  repairCostPerLevel: z.number().int().min(0),
  repairWaitHours: z.number().int().min(0).max(168),
  dailyBase: z.number().int().min(0),
  /** +bonus per consecutive day, 1_000 = +10% */
  dailyStreakBonusBp: z.number().int().min(0).max(100_000),
  dailyStreakMax: z.number().int().min(1).max(30),
  /** Drop chance per session, 3_000 = 30% */
  oreDropBp: oreRecord,
  /** $ZGEMS paid per ore in the shop [TBA]; 0 disables that exchange. */
  oreExchange: oreRecord,
  raffleTicketPrice: z.number().int().min(1),
  payout: z.object({
    /** 0 = Sunday … 6 = Saturday; cutoff is 00:00 UTC on this day. */
    weekday: z.number().int().min(0).max(6),
    /** Balances below this roll into the next batch (decision #12). */
    minimum: z.number().int().min(0),
    maxPerUser: z.number().int().min(1),
    maxPerBatch: z.number().int().min(1),
    /** [TBA] Pay the remaining balance of a moved pass one last time. */
    payMovedPasses: z.boolean(),
  }),
  /** Decision #11: where spent tokens go. "burn" is the recommendation. */
  sinkMode: z.enum(["burn", "recycle"]),
});

export type EconomyParams = z.infer<typeof economyParamsSchema>;

/** Development example values from blueprint §7.4. Not final economics. */
export const DEV_ECONOMY_PARAMS: EconomyParams = {
  sessionHours: 12,
  baseRatePerHour: 50,
  levelMultiplierBp: [10_000, 12_500, 15_000, 20_000, 25_000],
  upgradeCost: [2_000, 6_000, 15_000, 40_000],
  durabilityMax: [10, 14, 20, 28, 40],
  pickaxeEnabled: true,
  repairCostPerLevel: 150,
  repairWaitHours: 24,
  dailyBase: 100,
  dailyStreakBonusBp: 1_000,
  dailyStreakMax: 7,
  oreDropBp: { goldstone: 3_000, grapestone: 1_000, mint_stone: 300 },
  oreExchange: { goldstone: 20, grapestone: 75, mint_stone: 400 },
  raffleTicketPrice: 500,
  payout: {
    weekday: 1,
    minimum: 1_000,
    maxPerUser: 250_000,
    maxPerBatch: 50_000_000,
    payMovedPasses: true,
  },
  sinkMode: "burn",
};

export function parseEconomyParams(input: unknown): EconomyParams {
  return economyParamsSchema.parse(input);
}
