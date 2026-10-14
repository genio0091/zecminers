import type { EconomyParams } from "./config";
import { BP, DAY_MS, HOUR_MS } from "./constants";
import { previousUtcDay, utcDay } from "./time";

/**
 * The daily shift (litepaper §05): one 12-hour mining window a day. Miners are deployed while
 * the window is open, extract until it closes, then their owners claim a share of that day's
 * pool and gear up for the next shift. All times are server UTC.
 */
export interface ShiftClock {
  /** Shift day (YYYY-MM-DD): the UTC date on which the most recent window opened. */
  day: string;
  opensAt: Date;
  closesAt: Date;
  nextOpensAt: Date;
  open: boolean;
}

export function shiftDurationMs(params: EconomyParams): number {
  return params.shiftHours * HOUR_MS;
}

/** The window for a given shift day. */
export function shiftWindow(params: EconomyParams, day: string): { opensAt: Date; closesAt: Date } {
  const opensAt = new Date(Date.parse(`${day}T00:00:00Z`) + params.shiftOpenHourUtc * HOUR_MS);
  return { opensAt, closesAt: new Date(opensAt.getTime() + shiftDurationMs(params)) };
}

export function shiftClock(params: EconomyParams, now: Date): ShiftClock {
  const day = utcDay(new Date(now.getTime() - params.shiftOpenHourUtc * HOUR_MS));
  const { opensAt, closesAt } = shiftWindow(params, day);
  return {
    day,
    opensAt,
    closesAt,
    nextOpensAt: new Date(opensAt.getTime() + DAY_MS),
    open: now.getTime() < closesAt.getTime(),
  };
}

/** Share of the window a Miner works, in basis points: joining late means a shorter shift. */
export function workedBp(params: EconomyParams, deployedAt: Date, closesAt: Date): number {
  const ms = closesAt.getTime() - deployedAt.getTime();
  return Math.max(0, Math.min(BP, Math.floor((ms * BP) / shiftDurationMs(params))));
}

/** Claim weight: trait power × time worked. 10_000 = one 1.00× Miner for the full window. */
export function minerWeight(powerBp: number, worked: number): number {
  return Math.floor((Math.max(0, powerBp) * Math.max(0, Math.min(BP, worked))) / BP);
}

/**
 * share = ⌊ pool × weight / total weight of the shift ⌋. Integer maths only, so the shares of a
 * shift never add up to more than its pool; the rounding dust stays in the mining pool.
 */
export function shiftShare(pool: bigint, weight: number, totalWeight: bigint | number): bigint {
  const total = BigInt(totalWeight);
  if (pool <= 0n || weight <= 0 || total <= 0n) return 0n;
  const w = BigInt(weight) > total ? total : BigInt(weight);
  return (pool * w) / total;
}

/** Day N of the season (1-based) for a shift day, or 0 before the season starts. */
export function seasonDay(seasonStart: string | null, day: string): number {
  if (!seasonStart) return 0;
  const diff = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${seasonStart}T00:00:00Z`)) / DAY_MS);
  return diff < 0 ? 0 : diff + 1;
}

// ------------------------------------------------------------------ Miner status

export type MinerStatus = "ready" | "waiting" | "extracting" | "claimable" | "needs_gear" | "geared" | "stopped";

export interface MinerSnapshot {
  passActive: boolean;
  /** The Miner's most recent shift, if it ever worked one. */
  latest: { day: string; endsAt: Date; collectedAt: Date | null; gearedAt: Date | null } | null;
}

/**
 * Deploy → Extract → Claim → Gear up (litepaper §05):
 *  ready/waiting → extracting (deploy, window open) → claimable (window closed)
 *  → needs_gear (claimed) → geared (ready when the next window opens) → ready.
 * A moved or deactivated pass stops the Miner.
 */
export function deriveMinerStatus(m: MinerSnapshot, clock: ShiftClock, now: Date): MinerStatus {
  if (!m.passActive) return "stopped";
  const s = m.latest;
  if (s && !s.collectedAt) return now.getTime() < s.endsAt.getTime() ? "extracting" : "claimable";
  if (s && !s.gearedAt) return "needs_gear";
  if (s?.gearedAt) {
    // Already worked today's shift, or geared up after today's window closed: wait for the next one.
    if (s.day === clock.day || (!clock.open && s.gearedAt.getTime() >= clock.opensAt.getTime())) return "geared";
  }
  return clock.open ? "ready" : "waiting";
}

// ------------------------------------------------------------------ streak

/** Streak = consecutive shift days with a gear-up. Missing a day starts it again at 1. */
export function nextStreak(last: { day: string; streak: number } | null, today: string): number {
  if (!last) return 1;
  if (last.day === today) return last.streak;
  if (last.day === previousUtcDay(today)) return last.streak + 1;
  return 1;
}

/** The streak still counts if the last gear-up was today or yesterday. */
export function liveStreak(last: { day: string; streak: number } | null, today: string): number {
  if (!last) return 0;
  return last.day === today || last.day === previousUtcDay(today) ? last.streak : 0;
}

/** base × (1 + step × (days − 1)), the days capped at `streakBonusMaxDays`. */
export function streakBonus(params: EconomyParams, streak: number): bigint {
  if (params.streakBonusBase <= 0 || streak < 1) return 0n;
  const days = Math.min(Math.floor(streak), params.streakBonusMaxDays);
  return (BigInt(params.streakBonusBase) * BigInt(BP + params.streakBonusStepBp * (days - 1))) / BigInt(BP);
}

/** The shift day a timestamp falls in. */
export function shiftDayOf(params: EconomyParams, at: Date): string {
  return utcDay(new Date(at.getTime() - params.shiftOpenHourUtc * HOUR_MS));
}

/** Days of mining left at the current daily pool. */
export function runwayDays(poolRemaining: bigint, dailyPool: number): number | null {
  if (dailyPool <= 0) return null;
  return Number(poolRemaining / BigInt(dailyPool));
}
