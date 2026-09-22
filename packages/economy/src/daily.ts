import type { EconomyParams } from "./config";
import { BP } from "./constants";
import { previousUtcDay } from "./time";

/** Streak continues only if the previous claim was yesterday (UTC); otherwise it resets to 1. */
export function nextStreak(
  params: EconomyParams,
  lastClaim: { day: string; streak: number } | null,
  today: string,
): number {
  if (!lastClaim) return 1;
  if (lastClaim.day === today) return lastClaim.streak;
  if (lastClaim.day === previousUtcDay(today)) {
    return Math.min(lastClaim.streak + 1, params.dailyStreakMax);
  }
  return 1;
}

/** 100 base, +10% per consecutive day, capped at `dailyStreakMax` days (blueprint §7.4). */
export function dailyReward(params: EconomyParams, streak: number): bigint {
  const days = Math.max(1, Math.min(Math.floor(streak), params.dailyStreakMax));
  const multiplierBp = BP + params.dailyStreakBonusBp * (days - 1);
  return (BigInt(params.dailyBase) * BigInt(multiplierBp)) / BigInt(BP);
}
