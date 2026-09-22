import { DAY_MS } from "./constants";

/** All game time is server UTC (blueprint §5.3). */
export function utcDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

export function nextUtcMidnight(at: Date): Date {
  return new Date(startOfUtcDay(at).getTime() + DAY_MS);
}

export function previousUtcDay(day: string): string {
  return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS));
}

/** Next 00:00 UTC on `weekday` (0 = Sunday), strictly after `at`. */
export function nextWeeklyCutoff(at: Date, weekday: number): Date {
  const midnight = startOfUtcDay(at);
  let delta = (weekday - midnight.getUTCDay() + 7) % 7;
  if (delta === 0 && midnight.getTime() <= at.getTime()) delta = 7;
  return new Date(midnight.getTime() + delta * DAY_MS);
}

/** ISO-8601 week label, e.g. "2026-W39". Batches are keyed by this. */
export function isoWeek(at: Date): string {
  const d = startOfUtcDay(at);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatCountdown(ms: number): string {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3_600);
  s -= h * 3_600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d}d ${p(h)}:${p(m)}:${p(s)}`;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
