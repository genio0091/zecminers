import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DEV_ECONOMY_PARAMS as P,
  HOUR_MS,
  computeReward,
  dailyReward,
  deriveSlotState,
  durabilityMax,
  maxSessionReward,
  nextStreak,
  parseEconomyParams,
  ratePerHour,
  repairCost,
  rollOreDrops,
  runwayDays,
  upgradeCost,
} from "../src";

describe("computeReward", () => {
  it("matches the blueprint example: 50/h × 12 h × L1", () => {
    expect(computeReward({ params: P, level: 1, elapsedMs: 12 * HOUR_MS })).toBe(600n);
  });

  it("applies level multipliers", () => {
    expect(computeReward({ params: P, level: 2, elapsedMs: 12 * HOUR_MS })).toBe(750n);
    expect(computeReward({ params: P, level: 5, elapsedMs: 12 * HOUR_MS })).toBe(1500n);
  });

  it("floors partial hours", () => {
    // 50 × 1.25 × 0.5 h = 31.25 → 31
    expect(computeReward({ params: P, level: 2, elapsedMs: HOUR_MS / 2 })).toBe(31n);
  });

  it("caps at session length", () => {
    expect(computeReward({ params: P, level: 1, elapsedMs: 48 * HOUR_MS })).toBe(600n);
  });

  it("is always an integer between 0 and the session cap (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -HOUR_MS, max: 100 * HOUR_MS }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 50_000 }),
        (elapsedMs, level, boostBp) => {
          const r = computeReward({ params: P, level, elapsedMs, boostBp });
          expect(r >= 0n).toBe(true);
          expect(r <= maxSessionReward(P, level, boostBp)).toBe(true);
        },
      ),
    );
  });

  it("never decreases as time passes (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 * HOUR_MS }),
        fc.integer({ min: 0, max: 12 * HOUR_MS }),
        fc.integer({ min: 1, max: 5 }),
        (a, b, level) => {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          expect(computeReward({ params: P, level, elapsedMs: lo }) <= computeReward({ params: P, level, elapsedMs: hi })).toBe(true);
        },
      ),
    );
  });
});

describe("levels, durability, costs", () => {
  it("reads the dev tables", () => {
    expect(ratePerHour(P, 1)).toBe(50);
    expect(ratePerHour(P, 4)).toBe(100);
    expect(durabilityMax(P, 3)).toBe(20);
    expect(upgradeCost(P, 1)).toBe(2000);
    expect(upgradeCost(P, 4)).toBe(40000);
    expect(upgradeCost(P, 5)).toBeNull();
    expect(repairCost(P, 3)).toBe(450);
  });
});

describe("daily reward", () => {
  it("adds 10% per streak day up to 7", () => {
    expect(dailyReward(P, 1)).toBe(100n);
    expect(dailyReward(P, 2)).toBe(110n);
    expect(dailyReward(P, 7)).toBe(160n);
    expect(dailyReward(P, 30)).toBe(160n);
  });

  it("continues only from yesterday", () => {
    expect(nextStreak(P, null, "2026-09-22")).toBe(1);
    expect(nextStreak(P, { day: "2026-09-21", streak: 3 }, "2026-09-22")).toBe(4);
    expect(nextStreak(P, { day: "2026-09-20", streak: 3 }, "2026-09-22")).toBe(1);
    expect(nextStreak(P, { day: "2026-09-21", streak: 7 }, "2026-09-22")).toBe(7);
  });
});

describe("slot state machine", () => {
  const now = new Date("2026-09-22T10:00:00Z");
  const base = { durability: 5, passActive: true, brokenUntil: null, session: null } as const;

  it("idle → mining → ready", () => {
    const session = { startedAt: new Date("2026-09-22T06:00:00Z"), endsAt: new Date("2026-09-22T18:00:00Z"), collectedAt: null };
    expect(deriveSlotState({ ...base, state: "idle" }, now)).toBe("idle");
    expect(deriveSlotState({ ...base, state: "mining", session }, now)).toBe("mining");
    expect(deriveSlotState({ ...base, state: "mining", session }, new Date("2026-09-22T18:00:00Z"))).toBe("ready");
  });

  it("broken → repairing → idle", () => {
    expect(deriveSlotState({ ...base, state: "broken" }, now)).toBe("broken");
    const brokenUntil = new Date("2026-09-23T10:00:00Z");
    expect(deriveSlotState({ ...base, state: "broken", brokenUntil }, now)).toBe("repairing");
    expect(deriveSlotState({ ...base, state: "broken", brokenUntil }, brokenUntil)).toBe("idle");
  });

  it("a moved pass stops the slot", () => {
    expect(deriveSlotState({ ...base, state: "idle", passActive: false }, now)).toBe("stopped");
  });
});

describe("ore drops and runway", () => {
  it("uses the injected RNG", () => {
    expect(rollOreDrops(P, () => 0)).toEqual({ goldstone: 1, grapestone: 1, mint_stone: 1 });
    expect(rollOreDrops(P, () => 9_999)).toEqual({ goldstone: 0, grapestone: 0, mint_stone: 0 });
    expect(rollOreDrops(P, () => 1_500)).toEqual({ goldstone: 1, grapestone: 0, mint_stone: 0 });
    // half a session halves the chance: goldstone 30% → 15%
    expect(rollOreDrops(P, () => 1_600, 5_000)).toEqual({ goldstone: 0, grapestone: 0, mint_stone: 0 });
    expect(rollOreDrops(P, () => 1_400, 5_000)).toEqual({ goldstone: 1, grapestone: 0, mint_stone: 0 });
  });

  it("computes runway in days", () => {
    expect(runwayDays({ poolRemaining: 8_000_000_000n, activeSlots: 1000, avgRewardPerSlotDay: 800n })).toBe(10_000);
    expect(runwayDays({ poolRemaining: 1n, activeSlots: 0, avgRewardPerSlotDay: 800n })).toBeNull();
  });
});

describe("config schema", () => {
  it("accepts the dev params and rejects bad ones", () => {
    expect(parseEconomyParams(P)).toEqual(P);
    expect(() => parseEconomyParams({ ...P, baseRatePerHour: -1 })).toThrow();
    expect(() => parseEconomyParams({ ...P, levelMultiplierBp: [1, 2] })).toThrow();
  });
});
