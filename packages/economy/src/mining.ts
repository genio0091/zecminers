import type { EconomyParams } from "./config";
import { BP, HOUR_MS, MAX_LEVEL, ORES, type OreId } from "./constants";

function clampLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) return 1;
  return Math.min(level, MAX_LEVEL);
}

export function levelMultiplierBp(params: EconomyParams, level: number): number {
  return params.levelMultiplierBp[clampLevel(level) - 1] ?? BP;
}

export function durabilityMax(params: EconomyParams, level: number): number {
  return params.durabilityMax[clampLevel(level) - 1] ?? params.durabilityMax[0]!;
}

/** Cost to go from `level` to `level + 1`, or null at max level. */
export function upgradeCost(params: EconomyParams, level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return params.upgradeCost[clampLevel(level) - 1] ?? null;
}

export function repairCost(params: EconomyParams, level: number): number {
  return params.repairCostPerLevel * clampLevel(level);
}

export function sessionDurationMs(params: EconomyParams): number {
  return params.sessionHours * HOUR_MS;
}

/** Whole $ZGEMS per hour for display. The authoritative figure is `computeReward`. */
export function ratePerHour(params: EconomyParams, level: number, boostBp: number = BP): number {
  return Math.floor(
    (params.baseRatePerHour * levelMultiplierBp(params, level) * boostBp) / (BP * BP),
  );
}

export interface RewardInput {
  params: EconomyParams;
  level: number;
  elapsedMs: number;
  boostBp?: number;
}

/**
 * reward = ⌊ r_base × min(h_elapsed, session_hours) × m_level × m_boost ⌋   (blueprint §7.3)
 * Integer maths only: never negative, never above the full-session value.
 */
export function computeReward({ params, level, elapsedMs, boostBp = BP }: RewardInput): bigint {
  const capped = BigInt(Math.max(0, Math.min(Math.floor(elapsedMs), sessionDurationMs(params))));
  const numerator =
    BigInt(params.baseRatePerHour) *
    capped *
    BigInt(levelMultiplierBp(params, level)) *
    BigInt(Math.max(0, Math.floor(boostBp)));
  return numerator / (BigInt(HOUR_MS) * BigInt(BP) * BigInt(BP));
}

/** Upper bound for one session — used by limits and simulations. */
export function maxSessionReward(params: EconomyParams, level: number, boostBp: number = BP): bigint {
  return computeReward({ params, level, elapsedMs: sessionDurationMs(params), boostBp });
}

export type StoredSlotState = "idle" | "mining" | "broken";
export type DerivedSlotState = "idle" | "mining" | "ready" | "broken" | "repairing" | "stopped";

export interface SlotSnapshot {
  state: StoredSlotState;
  brokenUntil: Date | null;
  durability: number;
  passActive: boolean;
  session: { startedAt: Date; endsAt: Date; collectedAt: Date | null } | null;
}

/**
 * The state machine from blueprint §7.3:
 * Idle → Mining (start) → Ready (12 h) → Idle (collect); Idle → Broken (durability 0);
 * Broken → Idle after repair + wait. A moved/deactivated pass stops the slot permanently.
 */
export function deriveSlotState(slot: SlotSnapshot, now: Date): DerivedSlotState {
  if (!slot.passActive) return "stopped";
  if (slot.state === "broken") {
    if (!slot.brokenUntil) return "broken";
    return now.getTime() >= slot.brokenUntil.getTime() ? "idle" : "repairing";
  }
  if (slot.state === "mining" && slot.session && !slot.session.collectedAt) {
    return now.getTime() >= slot.session.endsAt.getTime() ? "ready" : "mining";
  }
  return "idle";
}

/** Probability rolls use an injectable RNG so the server can use crypto.randomInt. */
export type RandomInt = (maxExclusive: number) => number;

/**
 * One roll per ore per session. `fractionBp` scales the chance by how much of the session
 * was mined, so collecting after one minute doesn't farm full-session drops.
 */
export function rollOreDrops(params: EconomyParams, rng: RandomInt, fractionBp: number = BP): Record<OreId, number> {
  const f = Math.max(0, Math.min(BP, Math.floor(fractionBp)));
  const drops = {} as Record<OreId, number>;
  for (const ore of ORES) {
    const chance = Math.floor((params.oreDropBp[ore] * f) / BP);
    drops[ore] = rng(BP) < chance ? 1 : 0;
  }
  return drops;
}

export function oreExchangeValue(params: EconomyParams, ore: OreId, qty: number): bigint {
  if (!Number.isInteger(qty) || qty <= 0) return 0n;
  return BigInt(params.oreExchange[ore]) * BigInt(qty);
}

export interface RunwayInput {
  poolRemaining: bigint;
  activeSlots: number;
  avgRewardPerSlotDay: bigint;
}

/** runway_days = pool_left / (active_slots × avg_reward_per_day) — shown daily to admins. */
export function runwayDays({ poolRemaining, activeSlots, avgRewardPerSlotDay }: RunwayInput): number | null {
  if (activeSlots <= 0 || avgRewardPerSlotDay <= 0n) return null;
  return Number(poolRemaining / (BigInt(activeSlots) * avgRewardPerSlotDay));
}
