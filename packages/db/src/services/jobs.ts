import type { ChainIndexer, ZebraRpc } from "@zecminers/zord-client";
import { blockSeconds } from "@zecminers/zcash";
import { createHash } from "node:crypto";
import type { Database } from "../client";
import { checkBalanceCache, rebuildBalanceCache, runReserveChecks } from "../invariants";
import { getFreezeWindows, getMaintenance, getNu7ActivationHeight, recordAlert, setMaintenance } from "../system";
import { checkPassOwners } from "./passes";
import { createWeeklyBatch, holdAllOpenBatches, settlePayouts, simulateSigner } from "./payouts";
import { closeDueRaffles } from "./raffles";

/**
 * Scheduled jobs (blueprint §5, §8.4, §10). Each is a plain async function so it can run from
 * the pg-boss worker (VPS) or from a Vercel Cron route — same code, same guarantees.
 */
export interface JobContext {
  db: Database;
  indexer: ChainIndexer;
  zebra: ZebraRpc | null;
  chainMode: "mock" | "live";
  now?: () => Date;
}

const now = (ctx: JobContext) => (ctx.now ? ctx.now() : new Date());

async function tipHeight(ctx: JobContext): Promise<number> {
  if (ctx.zebra) return ctx.zebra.getBlockCount();
  return (await ctx.indexer.status()).height;
}

/** Every 5 min: reserve invariants → snapshot. A failure trips maintenance and holds payouts. */
export async function jobInvariants(ctx: JobContext) {
  const res = await runReserveChecks(ctx.db, ctx.indexer);
  if (!res.ok) {
    const failed = res.invariants.filter((i) => i.ok === false).map((i) => `${i.name}: ${i.detail}`);
    const maint = await getMaintenance(ctx.db);
    if (!maint.on) {
      await setMaintenance(ctx.db, true, `reserve check failed: ${failed.join(" | ")}`, "system");
      const held = await holdAllOpenBatches(ctx.db, "circuit breaker: reserve check failed");
      await recordAlert(ctx.db, "critical", "invariant_failed", `${failed.join(" | ")} — maintenance on, ${held} batch(es) held`);
    }
  }
  return { ok: res.ok, invariants: res.invariants };
}

/** Hourly: cached balance = SUM(entries). Drift is alerted and rebuilt from entries. */
export async function jobBalanceCache(ctx: JobContext) {
  const r = await checkBalanceCache(ctx.db);
  if (!r.ok) {
    await recordAlert(ctx.db, "high", "balance_cache_drift", `${r.drifted.length} account(s) drifted; rebuilding from entries`);
    await rebuildBalanceCache(ctx.db, r.drifted);
  }
  return { ok: r.ok, drifted: r.drifted.length };
}

/** Hourly: soulbound rule — pass must still be at its origin address. */
export async function jobPassOwners(ctx: JobContext) {
  if (ctx.chainMode === "mock") return { skipped: "mock indexer: owners always match" };
  return checkPassOwners(ctx.db, ctx.indexer, now(ctx));
}

/** Weekly at the cutoff: build the batch. Idempotent per ISO week. */
export async function jobPayoutCutoff(ctx: JobContext) {
  return createWeeklyBatch(ctx.db, { now: now(ctx), freezeWindows: await getFreezeWindows(ctx.db) });
}

/** Every 5 min: settle final payouts, return failed ones, close finished batches. */
export async function jobPayoutSettle(ctx: JobContext) {
  const tip = await tipHeight(ctx);
  if (ctx.chainMode === "mock" && process.env.NODE_ENV !== "production") {
    await simulateSigner(ctx.db, { height: tip });
  }
  return settlePayouts(ctx.db, {
    indexer: ctx.indexer,
    tipHeight: ctx.chainMode === "mock" ? tip + 1_000 : tip,
    nu7ActivationHeight: await getNu7ActivationHeight(ctx.db),
    verifyOwnership: ctx.chainMode === "live",
  });
}

/** Every 5 min: stop raffle ticket sales one block before H. */
export async function jobRaffleClose(ctx: JobContext) {
  return { closed: await closeDueRaffles(ctx.db, await tipHeight(ctx)) };
}

/** Every 5 min: Zebra behind the network or Zord behind Zebra for > 10 min → alert. */
export async function jobChainLag(ctx: JobContext) {
  if (!ctx.zebra) return { skipped: "no Zebra RPC configured" };
  const [zebraTip, zord] = await Promise.all([ctx.zebra.getBlockCount(), ctx.indexer.status()]);
  const nu7 = await getNu7ActivationHeight(ctx.db);
  const lagBlocks = zebraTip - zord.height;
  const lagSeconds = lagBlocks * blockSeconds(zebraTip, nu7);
  if (lagSeconds > 600) {
    await recordAlert(ctx.db, "high", "zord_lagging", `Zord is ${lagBlocks} blocks (~${Math.round(lagSeconds / 60)} min) behind Zebra`);
  }
  return { zebraTip, zordHeight: zord.height, lagBlocks };
}

/** Block hash at H for the raffle draw. In mock mode it is derived deterministically. */
export async function blockHashAt(ctx: Pick<JobContext, "zebra" | "chainMode">, height: number): Promise<string> {
  if (ctx.zebra) return ctx.zebra.getBlockHash(height);
  if (ctx.chainMode === "mock") return createHash("sha256").update(`mock-block-${height}`).digest("hex");
  throw new Error("Zebra RPC is required to read block hashes");
}

export async function currentTipHeight(ctx: Pick<JobContext, "zebra" | "indexer">): Promise<number> {
  if (ctx.zebra) return ctx.zebra.getBlockCount();
  return (await ctx.indexer.status()).height;
}

export const JOBS = {
  invariants: { cron: "*/5 * * * *", run: jobInvariants },
  "balance-cache": { cron: "7 * * * *", run: jobBalanceCache },
  "pass-owners": { cron: "17 * * * *", run: jobPassOwners },
  "payout-cutoff": { cron: "0 0 * * 1", run: jobPayoutCutoff },
  "payout-settle": { cron: "*/5 * * * *", run: jobPayoutSettle },
  "raffle-close": { cron: "*/5 * * * *", run: jobRaffleClose },
  "chain-lag": { cron: "*/5 * * * *", run: jobChainLag },
} as const satisfies Record<string, { cron: string; run: (ctx: JobContext) => Promise<unknown> }>;

export type JobName = keyof typeof JOBS;
