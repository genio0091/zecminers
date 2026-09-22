"use client";

import { formatCountdown, nextWeeklyCutoff } from "@zecminers/economy";
import { useClock } from "@/lib/use-clock";

/** Live countdown to a target (ISO) or to the next weekly cutoff. `offsetMs` = serverTime − clientTime. */
export function Countdown({ target, weekday, offsetMs = 0, className }: { target?: string; weekday?: number; offsetMs?: number; className?: string }) {
  const now = useClock(offsetMs);
  if (now === null) return <span className={className}>—d --:--:--</span>;
  const end = target ? Date.parse(target) : nextWeeklyCutoff(new Date(now), weekday ?? 1).getTime();
  return <span className={className}>{formatCountdown(end - now)}</span>;
}
