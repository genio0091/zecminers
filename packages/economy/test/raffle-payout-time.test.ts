import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DEV_ECONOMY_PARAMS as P,
  drawWinners,
  formatCountdown,
  formatZgems,
  inFreezeWindow,
  isoWeek,
  nextWeeklyCutoff,
  planPayoutBatch,
  raffleWinnerIndex,
  seedCommitment,
  ticketOwner,
} from "../src";

const seed = "7d1f0c6f4a2b9e8d3c5a1f0e9b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b";
const blockHash = "00000000014a6c3b2d5e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c";

describe("raffle", () => {
  it("matches an independent node:crypto implementation", () => {
    const mac = createHmac("sha256", Buffer.from(seed, "hex")).update(`${blockHash}42`).digest("hex");
    const expected = Number(BigInt(`0x${mac}`) % 1000n);
    expect(raffleWinnerIndex(seed, blockHash, 42, 1000)).toBe(expected);
  });

  it("commits to sha256(seed bytes)", () => {
    expect(seedCommitment(seed)).toBe(createHash("sha256").update(Buffer.from(seed, "hex")).digest("hex"));
  });

  it("draws distinct winners deterministically", () => {
    const a = drawWinners(seed, blockHash, 7, 50, 5);
    expect(new Set(a).size).toBe(5);
    expect(drawWinners(seed, blockHash, 7, 50, 5)).toEqual(a);
    expect(a[0]).toBe(raffleWinnerIndex(seed, blockHash, 7, 50));
  });

  it("maps an index to a ticket range", () => {
    const ranges = [
      { userId: "a", startIndex: 0, count: 3 },
      { userId: "b", startIndex: 3, count: 2 },
    ];
    expect(ticketOwner(ranges, 2)?.userId).toBe("a");
    expect(ticketOwner(ranges, 4)?.userId).toBe("b");
    expect(ticketOwner(ranges, 5)).toBeNull();
  });
});

describe("payout planning", () => {
  const c = (userId: string, balance: bigint, extra: Partial<Parameters<typeof planPayoutBatch>[1][number]> = {}) => ({
    userId,
    passId: `p-${userId}`,
    address: `t1${userId}`,
    balance,
    passStatus: "active" as const,
    userStatus: "active" as const,
    ...extra,
  });

  it("pays eligible users, rolls small balances over, skips frozen", () => {
    const plan = planPayoutBatch(P, [
      c("a", 5_000n),
      c("b", 999n),
      c("c", 8_000n, { userStatus: "frozen" }),
      c("d", 3_000n, { passStatus: "moved" }),
      c("e", 3_000n, { passStatus: "deactivated" }),
    ]);
    expect(plan.items.map((i) => i.userId)).toEqual(["a", "d"]);
    expect(plan.total).toBe(8_000n);
    expect(plan.skipped.map((s) => s.reason).sort()).toEqual(["below_minimum", "frozen", "pass_inactive"]);
    expect(plan.holdReasons).toEqual([]);
  });

  it("caps per user and holds the batch for review", () => {
    const plan = planPayoutBatch(P, [c("a", 300_000n)]);
    expect(plan.items[0]!.amount).toBe(250_000n);
    expect(plan.items[0]!.carriedOver).toBe(50_000n);
    expect(plan.holdReasons.length).toBe(1);
  });

  it("detects the NU7 freeze window", () => {
    const windows = [{ from: "2026-11-03T00:00:00Z", to: "2026-11-07T00:00:00Z", reason: "NU7 ±48h" }];
    expect(inFreezeWindow(new Date("2026-11-05T12:00:00Z"), windows)?.reason).toBe("NU7 ±48h");
    expect(inFreezeWindow(new Date("2026-11-10T00:00:00Z"), windows)).toBeNull();
  });
});

describe("time helpers", () => {
  it("finds the next Monday 00:00 UTC", () => {
    // 2026-09-22 is a Tuesday
    expect(nextWeeklyCutoff(new Date("2026-09-22T09:00:00Z"), 1).toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(nextWeeklyCutoff(new Date("2026-09-28T00:00:00Z"), 1).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(nextWeeklyCutoff(new Date("2026-09-27T23:59:59Z"), 1).toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });

  it("labels ISO weeks", () => {
    expect(isoWeek(new Date("2026-09-22T00:00:00Z"))).toBe("2026-W39");
    expect(isoWeek(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });

  it("formats amounts and countdowns", () => {
    expect(formatZgems(10_000_000_000n)).toBe("10,000,000,000");
    expect(formatZgems("-1500")).toBe("-1,500");
    expect(formatCountdown(90_061_000)).toBe("1d 01:01:01");
  });
});
