import { z } from "zod";
import { SEASON_1, SEASON_1_DAILY_POOL } from "./constants";

/**
 * Economy parameters, stored as a versioned row in `economy_config`.
 * Everything is an integer; multipliers are basis points. A shift uses the version that was
 * active when its window opened, so a change never moves the goalposts mid-shift.
 */
export const economyParamsSchema = z.object({
  /** Length of the daily mining window. */
  shiftHours: z.number().int().min(1).max(23),
  /** UTC hour the window opens every day. Exact times are confirmed before launch. */
  shiftOpenHourUtc: z.number().int().min(0).max(23),
  /** $VALLEY split between every Miner that worked a shift (Season 1: 7B / 180 days). */
  dailyPool: z.number().int().min(0),
  /** Planned season length, for the season clock. The season really ends when the pool is mined out. */
  seasonDays: z.number().int().min(1).max(3650),
  /** First shift day (UTC, YYYY-MM-DD). Null until announced: the season then starts on the genesis day. */
  seasonStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  /** Off: every Miner counts as 1.00× until the final trait mechanics are confirmed. */
  traitPowerEnabled: z.boolean(),
  /** Paid from the community pool on a player's first gear-up of a shift day. 0 switches it off. */
  streakBonusBase: z.number().int().min(0),
  /** Extra per consecutive day, 1_000 = +10%. */
  streakBonusStepBp: z.number().int().min(0).max(100_000),
  /** The bonus stops growing after this many days (the streak itself keeps counting). */
  streakBonusMaxDays: z.number().int().min(1).max(30),
  /** Default ticket price for paid raffles. Holder raffles (price 0) give one free entry per Miner. */
  raffleTicketPrice: z.number().int().min(0),
  payout: z.object({
    /** 0 = Sunday … 6 = Saturday; cutoff is 00:00 UTC on this day. */
    weekday: z.number().int().min(0).max(6),
    /** Balances below this roll into the next batch. */
    minimum: z.number().int().min(0),
    maxPerUser: z.number().int().min(1),
    maxPerBatch: z.number().int().min(1),
    /** Pay the remaining balance of a moved pass one last time. */
    payMovedPasses: z.boolean(),
  }),
  /** Where spent tokens (paid raffle tickets) go. */
  sinkMode: z.enum(["burn", "recycle"]),
});

export type EconomyParams = z.infer<typeof economyParamsSchema>;

/** Development values. Shift times and streak bonus sizes are confirmed before launch. */
export const DEV_ECONOMY_PARAMS: EconomyParams = {
  shiftHours: 12,
  shiftOpenHourUtc: 0,
  dailyPool: SEASON_1_DAILY_POOL,
  seasonDays: SEASON_1.days,
  seasonStart: null,
  traitPowerEnabled: true,
  streakBonusBase: 500,
  streakBonusStepBp: 1_000,
  streakBonusMaxDays: 7,
  raffleTicketPrice: 0,
  payout: {
    weekday: 1,
    minimum: 1_000,
    maxPerUser: 50_000_000,
    maxPerBatch: 400_000_000,
    payMovedPasses: true,
  },
  sinkMode: "burn",
};

/**
 * Config rows written before the Hood Valley shift model (session/level/pickaxe params) are
 * read as the new shape: the shift length and payout schedule carry over, everything else —
 * including the payout limits, which were sized for a much smaller emission — takes the defaults.
 */
function upgradeLegacyParams(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const raw = input as Record<string, unknown>;
  if ("shiftHours" in raw || !("sessionHours" in raw)) return input;
  const old = (raw.payout && typeof raw.payout === "object" ? raw.payout : {}) as Record<string, unknown>;
  const base = DEV_ECONOMY_PARAMS.payout;
  return {
    ...DEV_ECONOMY_PARAMS,
    shiftHours: typeof raw.sessionHours === "number" && raw.sessionHours < 24 ? raw.sessionHours : DEV_ECONOMY_PARAMS.shiftHours,
    payout: {
      ...base,
      weekday: typeof old.weekday === "number" ? old.weekday : base.weekday,
      minimum: typeof old.minimum === "number" ? old.minimum : base.minimum,
      payMovedPasses: typeof old.payMovedPasses === "boolean" ? old.payMovedPasses : base.payMovedPasses,
    },
    sinkMode: raw.sinkMode === "recycle" ? "recycle" : "burn",
  };
}

export function parseEconomyParams(input: unknown): EconomyParams {
  return economyParamsSchema.parse(upgradeLegacyParams(input));
}
