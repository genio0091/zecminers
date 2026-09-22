import type { EconomyParams } from "./config";

export interface PayoutCandidate {
  userId: string;
  passId: string;
  address: string;
  balance: bigint;
  passStatus: "active" | "moved" | "deactivated" | "unclaimed";
  userStatus: "active" | "frozen";
}

export interface PlannedPayout {
  userId: string;
  passId: string;
  address: string;
  amount: bigint;
  /** Part of the balance above the per-user limit, left in the game for next week. */
  carriedOver: bigint;
}

export interface PayoutPlan {
  items: PlannedPayout[];
  skipped: { userId: string; reason: "below_minimum" | "frozen" | "pass_inactive" }[];
  total: bigint;
  /** Batch must be held for review instead of going to approval. */
  holdReasons: string[];
}

/**
 * Weekly cutoff (blueprint §10.1, §10.6): who gets paid, how much, and whether the batch
 * must be held. Payouts always go to the pass origin address — never anywhere else.
 */
export function planPayoutBatch(params: EconomyParams, candidates: PayoutCandidate[]): PayoutPlan {
  const items: PlannedPayout[] = [];
  const skipped: PayoutPlan["skipped"] = [];
  const minimum = BigInt(params.payout.minimum);
  const maxPerUser = BigInt(params.payout.maxPerUser);

  for (const c of candidates) {
    if (c.balance <= 0n) continue;
    if (c.userStatus === "frozen") {
      skipped.push({ userId: c.userId, reason: "frozen" });
      continue;
    }
    const eligible =
      c.passStatus === "active" || (c.passStatus === "moved" && params.payout.payMovedPasses);
    if (!eligible) {
      skipped.push({ userId: c.userId, reason: "pass_inactive" });
      continue;
    }
    if (c.balance < minimum) {
      skipped.push({ userId: c.userId, reason: "below_minimum" });
      continue;
    }
    const amount = c.balance > maxPerUser ? maxPerUser : c.balance;
    items.push({
      userId: c.userId,
      passId: c.passId,
      address: c.address,
      amount,
      carriedOver: c.balance - amount,
    });
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0n);
  const holdReasons: string[] = [];
  if (total > BigInt(params.payout.maxPerBatch)) {
    holdReasons.push(`batch total ${total} exceeds limit ${params.payout.maxPerBatch}`);
  }
  const capped = items.filter((i) => i.carriedOver > 0n).length;
  if (capped > 0) holdReasons.push(`${capped} user(s) hit the per-user weekly limit`);

  return { items, skipped, total, holdReasons };
}

export interface FreezeWindow {
  from: string;
  to: string;
  reason: string;
}

/** No $ZGEMS transactions ±48 h around NU7 activation (blueprint §2). */
export function inFreezeWindow(at: Date, windows: FreezeWindow[]): FreezeWindow | null {
  const t = at.getTime();
  return windows.find((w) => t >= Date.parse(w.from) && t <= Date.parse(w.to)) ?? null;
}
