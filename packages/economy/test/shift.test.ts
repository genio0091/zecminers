import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  BP,
  DEV_ECONOMY_PARAMS as P,
  POOL_ALLOCATION,
  SEASON_1,
  SEASON_1_DAILY_POOL,
  TOTAL_SUPPLY,
  deriveMinerStatus,
  liveStreak,
  minerLabel,
  minerTraits,
  minerWeight,
  nextStreak,
  parseEconomyParams,
  runwayDays,
  seasonDay,
  shiftClock,
  shiftDayOf,
  shiftShare,
  shiftWindow,
  streakBonus,
  workedBp,
  type MinerSnapshot,
} from "../src";

describe("tokenomics", () => {
  it("splits the fixed 10B supply 70/15/8/5/2", () => {
    const total = Object.values(POOL_ALLOCATION).reduce((a, b) => a + b, 0n);
    expect(total).toBe(TOTAL_SUPPLY);
    expect(Object.values(POOL_ALLOCATION).map((v) => Number((v * 100n) / TOTAL_SUPPLY))).toEqual([70, 15, 8, 5, 2]);
  });

  it("spreads the 7B Season 1 pool over 180 days", () => {
    expect(SEASON_1.pool).toBe(7_000_000_000n);
    expect(SEASON_1_DAILY_POOL).toBe(Math.ceil(7_000_000_000 / 180));
    expect(runwayDays(SEASON_1.pool, SEASON_1_DAILY_POOL)).toBe(179);
    expect(runwayDays(1n, 0)).toBeNull();
  });
});

describe("shift clock", () => {
  it("opens a 12-hour window at the configured UTC hour", () => {
    const c = shiftClock(P, new Date("2026-10-14T05:00:00Z"));
    expect(c.day).toBe("2026-10-14");
    expect(c.open).toBe(true);
    expect(c.opensAt.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(c.closesAt.toISOString()).toBe("2026-10-14T12:00:00.000Z");
    expect(c.nextOpensAt.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(shiftClock(P, new Date("2026-10-14T12:00:00Z")).open).toBe(false);
  });

  it("keeps the same shift day until the next window opens", () => {
    const p = { ...P, shiftOpenHourUtc: 14 };
    expect(shiftClock(p, new Date("2026-10-15T03:00:00Z")).day).toBe("2026-10-14");
    expect(shiftClock(p, new Date("2026-10-15T03:00:00Z")).open).toBe(false);
    expect(shiftClock(p, new Date("2026-10-15T14:00:00Z")).day).toBe("2026-10-15");
    expect(shiftDayOf(p, new Date("2026-10-15T13:59:59Z"))).toBe("2026-10-14");
    expect(shiftWindow(p, "2026-10-15").closesAt.toISOString()).toBe("2026-10-16T02:00:00.000Z");
  });

  it("counts season days from the start date", () => {
    expect(seasonDay(null, "2026-10-14")).toBe(0);
    expect(seasonDay("2026-10-14", "2026-10-13")).toBe(0);
    expect(seasonDay("2026-10-14", "2026-10-14")).toBe(1);
    expect(seasonDay("2026-10-14", "2027-04-11")).toBe(180);
  });
});

describe("pool shares", () => {
  const { closesAt } = shiftWindow(P, "2026-10-14");

  it("credits the time a Miner actually worked", () => {
    expect(workedBp(P, new Date("2026-10-14T00:00:00Z"), closesAt)).toBe(BP);
    expect(workedBp(P, new Date("2026-10-14T06:00:00Z"), closesAt)).toBe(5_000);
    expect(workedBp(P, closesAt, closesAt)).toBe(0);
    expect(minerWeight(12_500, 5_000)).toBe(6_250);
  });

  it("splits the daily pool by weight", () => {
    const pool = BigInt(SEASON_1_DAILY_POOL);
    expect(shiftShare(pool, 10_000, 10_000)).toBe(pool);
    expect(shiftShare(pool, 10_000, 3_333 * 10_000)).toBe(11_667n);
    expect(shiftShare(pool, 0, 10_000)).toBe(0n);
    expect(shiftShare(pool, 10_000, 0)).toBe(0n);
  });

  it("never pays out more than the pool, whatever the weights (property)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 12_500 }), { minLength: 1, maxLength: 60 }), fc.bigInt({ min: 0n, max: 10n ** 10n }), (weights, pool) => {
        const total = weights.reduce((a, b) => a + b, 0);
        const paid = weights.reduce((sum, w) => sum + shiftShare(pool, w, total), 0n);
        expect(paid <= pool).toBe(true);
        expect(paid >= 0n).toBe(true);
      }),
    );
  });

  it("pays more for more weight (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 12_500 }), fc.integer({ min: 0, max: 12_500 }), (a, b) => {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const pool = BigInt(SEASON_1_DAILY_POOL);
        expect(shiftShare(pool, lo, 50_000) <= shiftShare(pool, hi, 50_000)).toBe(true);
      }),
    );
  });
});

describe("Miner status", () => {
  const day = "2026-10-14";
  const { closesAt } = shiftWindow(P, day);
  const open = new Date("2026-10-14T05:00:00Z");
  const closed = new Date("2026-10-14T20:00:00Z");
  const at = (now: Date, latest: MinerSnapshot["latest"], passActive = true) => deriveMinerStatus({ passActive, latest }, shiftClock(P, now), now);

  it("deploy → extract → claim → gear up", () => {
    expect(at(open, null)).toBe("ready");
    expect(at(closed, null)).toBe("waiting");
    expect(at(open, { day, endsAt: closesAt, collectedAt: null, gearedAt: null })).toBe("extracting");
    expect(at(closed, { day, endsAt: closesAt, collectedAt: null, gearedAt: null })).toBe("claimable");
    expect(at(closed, { day, endsAt: closesAt, collectedAt: closed, gearedAt: null })).toBe("needs_gear");
    expect(at(closed, { day, endsAt: closesAt, collectedAt: closed, gearedAt: closed })).toBe("geared");
    const tomorrow = new Date("2026-10-15T01:00:00Z");
    expect(at(tomorrow, { day, endsAt: closesAt, collectedAt: closed, gearedAt: closed })).toBe("ready");
  });

  it("a late claim can still join today's shift once geared", () => {
    const yesterday = shiftWindow(P, "2026-10-13");
    const late = { day: "2026-10-13", endsAt: yesterday.closesAt, collectedAt: open, gearedAt: open };
    expect(at(open, late)).toBe("ready");
    expect(at(open, { ...late, collectedAt: null, gearedAt: null })).toBe("claimable");
  });

  it("gearing up after the window closed waits for the next one", () => {
    const yesterday = shiftWindow(P, "2026-10-13");
    expect(at(closed, { day: "2026-10-13", endsAt: yesterday.closesAt, collectedAt: closed, gearedAt: closed })).toBe("geared");
    const earlier = new Date("2026-10-13T20:00:00Z");
    expect(at(closed, { day: "2026-10-13", endsAt: yesterday.closesAt, collectedAt: earlier, gearedAt: earlier })).toBe("waiting");
  });

  it("a moved pass stops the Miner", () => {
    expect(at(open, null, false)).toBe("stopped");
  });

  it("the window closing ends extraction at the same instant", () => {
    expect(at(closesAt, { day, endsAt: closesAt, collectedAt: null, gearedAt: null })).toBe("claimable");
    expect(at(new Date(closesAt.getTime() - 1), { day, endsAt: closesAt, collectedAt: null, gearedAt: null })).toBe("extracting");
  });
});

describe("streak", () => {
  it("continues only from yesterday", () => {
    expect(nextStreak(null, "2026-10-14")).toBe(1);
    expect(nextStreak({ day: "2026-10-13", streak: 3 }, "2026-10-14")).toBe(4);
    expect(nextStreak({ day: "2026-10-14", streak: 3 }, "2026-10-14")).toBe(3);
    expect(nextStreak({ day: "2026-10-12", streak: 9 }, "2026-10-14")).toBe(1);
    expect(nextStreak({ day: "2026-10-13", streak: 9 }, "2026-10-14")).toBe(10);
    expect(liveStreak({ day: "2026-10-13", streak: 4 }, "2026-10-14")).toBe(4);
    expect(liveStreak({ day: "2026-10-12", streak: 4 }, "2026-10-14")).toBe(0);
  });

  it("adds 10% per day, capped at 7 days", () => {
    expect(streakBonus(P, 1)).toBe(500n);
    expect(streakBonus(P, 2)).toBe(550n);
    expect(streakBonus(P, 7)).toBe(800n);
    expect(streakBonus(P, 30)).toBe(800n);
    expect(streakBonus({ ...P, streakBonusBase: 0 }, 5)).toBe(0n);
  });
});

describe("Miner traits", () => {
  it("are deterministic per pass and stay within the trait tables", () => {
    for (let n = 1; n < 400; n++) {
      const t = minerTraits(n);
      expect(minerTraits(n)).toEqual(t);
      expect(["surface", "cave", "valley"]).toContain(t.kind);
      expect(t.powerBp).toBeGreaterThanOrEqual(10_000);
      expect(t.powerBp).toBeLessThanOrEqual(12_500);
    }
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => minerTraits(900_001 + i).kind));
    expect(kinds.size).toBe(3);
    expect(minerLabel(412)).toBe("#0412");
    expect(minerLabel(900_001)).toBe("#900001");
  });
});

describe("config schema", () => {
  it("accepts the dev params and rejects bad ones", () => {
    expect(parseEconomyParams(P)).toEqual(P);
    expect(() => parseEconomyParams({ ...P, shiftHours: 0 })).toThrow();
    expect(() => parseEconomyParams({ ...P, seasonStart: "14 Oct" })).toThrow();
  });

  it("reads config rows from before the shift model", () => {
    const legacy = {
      sessionHours: 12,
      baseRatePerHour: 50,
      levelMultiplierBp: [10_000, 12_500, 15_000, 20_000, 25_000],
      payout: { weekday: 3, minimum: 2_000, maxPerUser: 250_000, maxPerBatch: 50_000_000, payMovedPasses: false },
      sinkMode: "recycle",
    };
    const p = parseEconomyParams(legacy);
    expect(p.shiftHours).toBe(12);
    expect(p.dailyPool).toBe(SEASON_1_DAILY_POOL);
    expect(p.payout.weekday).toBe(3);
    expect(p.payout.minimum).toBe(2_000);
    expect(p.payout.payMovedPasses).toBe(false);
    expect(p.payout.maxPerUser).toBe(P.payout.maxPerUser);
    expect(p.sinkMode).toBe("recycle");
  });
});
