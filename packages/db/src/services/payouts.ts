import { randomBytes } from "node:crypto";
import { inFreezeWindow, isoWeek, planPayoutBatch, type FreezeWindow } from "@zecminers/economy";
import { estimatePayoutFeeZats, isFinal, payloadBytes, zrc20Transfer } from "@zecminers/zcash";
import type { ChainIndexer } from "@zecminers/zord-client";
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import type { Database, DbOrTx } from "../client";
import { GameError } from "../errors";
import { latestSnapshot } from "../invariants";
import { postLedgerTx, userAccountCode } from "../ledger";
import { ledgerAccounts, passes, payoutBatches, payoutItems, users, type PayoutItemStatus } from "../schema";
import { audit, getActiveConfig, getMaintenance, recordAlert } from "../system";

export type CutoffResult =
  | { status: "created"; batchId: string; week: string; recipients: number; total: string; held: boolean; holdReasons: string[] }
  | { status: "exists"; batchId: string; week: string }
  | { status: "skipped"; week: string; reason: string };

/**
 * Weekly cutoff (blueprint §10.1): move every eligible in-game balance into payout_pending and
 * create the week's batch. Nothing is signed here — the batch waits for a human approval.
 */
export async function createWeeklyBatch(
  db: Database,
  p: { now: Date; freezeWindows: FreezeWindow[]; actor?: string },
): Promise<CutoffResult> {
  const week = isoWeek(p.now);
  const freeze = inFreezeWindow(p.now, p.freezeWindows);
  if (freeze) {
    await recordAlert(db, "high", "payout_skipped", `Batch ${week} skipped: ${freeze.reason}. Balances roll over.`);
    return { status: "skipped", week, reason: freeze.reason };
  }
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(payoutBatches).where(eq(payoutBatches.week, week)).limit(1);
    if (existing) return { status: "exists", batchId: existing.id, week };

    const cfg = await getActiveConfig(tx, p.now);
    // Lock every funded player account so nothing is spent mid-cutoff.
    await tx
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(and(eq(ledgerAccounts.type, "user"), gt(ledgerAccounts.balance, 0n)))
      .orderBy(asc(ledgerAccounts.id))
      .for("update");
    const rows = await tx
      .select({
        userId: users.id,
        userStatus: users.status,
        passId: passes.id,
        passStatus: passes.status,
        address: passes.originAddress,
        balance: ledgerAccounts.balance,
      })
      .from(ledgerAccounts)
      .innerJoin(users, eq(users.id, ledgerAccounts.userId))
      .innerJoin(passes, eq(passes.userId, users.id))
      .where(and(eq(ledgerAccounts.type, "user"), gt(ledgerAccounts.balance, 0n)));

    const plan = planPayoutBatch(
      cfg.params,
      rows.map((r) => ({ ...r, balance: BigInt(r.balance) })),
    );
    const snapshot = await latestSnapshot(tx);
    const holdReasons = [...plan.holdReasons];
    if (!snapshot) holdReasons.push("no reserve check has run yet");
    else if (!snapshot.invariantsOk) holdReasons.push("latest reserve check failed");
    if ((await getMaintenance(tx)).on) holdReasons.push("maintenance mode is on");

    const perItemFee = estimatePayoutFeeZats(payloadBytes(zrc20Transfer("ZGEMS", "1000000000")));
    const [batch] = await tx
      .insert(payoutBatches)
      .values({
        week,
        status: holdReasons.length ? "held" : "draft",
        heldReason: holdReasons.join("; ") || null,
        totalAmount: plan.total,
        recipients: plan.items.length,
        feeZats: perItemFee * plan.items.length,
      })
      .returning();
    for (const item of plan.items) {
      await postLedgerTx(tx, {
        idempotencyKey: `payout-cutoff:${batch!.id}:${item.userId}`,
        kind: "payout_cutoff",
        refType: "payout_batch",
        refId: batch!.id,
        actor: p.actor ?? "worker",
        memo: `weekly payout ${week}`,
        entries: [
          { account: userAccountCode(item.userId), amount: -item.amount },
          { account: "payout_pending", amount: item.amount },
        ],
      });
      await tx.insert(payoutItems).values({
        batchId: batch!.id,
        userId: item.userId,
        passId: item.passId,
        address: item.address,
        amount: item.amount,
      });
    }
    if (holdReasons.length) {
      await recordAlert(tx, "high", "payout_held", `Batch ${week} held: ${holdReasons.join("; ")}`);
    }
    return {
      status: "created",
      batchId: batch!.id,
      week,
      recipients: plan.items.length,
      total: plan.total.toString(),
      held: holdReasons.length > 0,
      holdReasons,
    };
  });
}

/** Admin approval — the only way a batch reaches the signer (blueprint §10.6). */
export async function approveBatch(db: Database, p: { batchId: string; adminId: string; reason: string }) {
  return db.transaction(async (tx) => {
    const [batch] = await tx.select().from(payoutBatches).where(eq(payoutBatches.id, p.batchId)).for("update");
    if (!batch) throw new GameError("NOT_FOUND", "Batch not found.");
    if (batch.status !== "draft" && batch.status !== "held") {
      throw new GameError("BATCH_STATE", `Batch is ${batch.status}; only draft or held batches can be approved.`);
    }
    if ((await getMaintenance(tx)).on) throw new GameError("BATCH_STATE", "Maintenance is on. Payouts stay stopped.");
    const snap = await latestSnapshot(tx);
    if (!snap?.invariantsOk) throw new GameError("BATCH_STATE", "The latest reserve check did not pass. Circuit breaker is open.");
    await tx
      .update(payoutBatches)
      .set({ status: "approved", approvedBy: p.adminId, approvedAt: new Date(), heldReason: null })
      .where(eq(payoutBatches.id, batch.id));
    await tx
      .update(payoutItems)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(eq(payoutItems.batchId, batch.id), eq(payoutItems.status, "pending")));
    await audit(tx, {
      adminId: p.adminId,
      action: "payout_batch.approve",
      payload: { batchId: batch.id, week: batch.week, recipients: batch.recipients, total: String(batch.totalAmount) },
      reason: p.reason,
    });
    return { batchId: batch.id, status: "approved" as const };
  });
}

export async function holdBatch(db: DbOrTx, p: { batchId: string; adminId: string; reason: string }) {
  const [batch] = await db.select().from(payoutBatches).where(eq(payoutBatches.id, p.batchId));
  if (!batch) throw new GameError("NOT_FOUND", "Batch not found.");
  if (batch.status === "done") throw new GameError("BATCH_STATE", "Batch already completed.");
  await db.update(payoutBatches).set({ status: "held", heldReason: p.reason }).where(eq(payoutBatches.id, batch.id));
  // Items not yet picked up go back to pending; anything already signing continues to completion.
  await db
    .update(payoutItems)
    .set({ status: "pending", updatedAt: new Date() })
    .where(and(eq(payoutItems.batchId, batch.id), eq(payoutItems.status, "approved")));
  await audit(db, { adminId: p.adminId, action: "payout_batch.hold", payload: { batchId: batch.id, week: batch.week }, reason: p.reason });
  return { batchId: batch.id, status: "held" as const };
}

/** Circuit breaker: hold every batch that hasn't finished. */
export async function holdAllOpenBatches(db: DbOrTx, reason: string) {
  const open = await db
    .select({ id: payoutBatches.id })
    .from(payoutBatches)
    .where(inArray(payoutBatches.status, ["draft", "approved", "sending"]));
  for (const b of open) await holdBatch(db, { batchId: b.id, adminId: "system", reason });
  return open.length;
}

/**
 * After finality, confirm with Zord and move payout_pending → treasury_backing (blueprint §10.1).
 * Failed items that ran out of retries return to the player's in-game balance.
 */
export async function settlePayouts(
  db: Database,
  p: { indexer: ChainIndexer; tipHeight: number; nu7ActivationHeight: number | null; verifyOwnership: boolean },
) {
  const sent = await db
    .select()
    .from(payoutItems)
    .where(and(eq(payoutItems.status, "sent"), isNotNull(payoutItems.sendHeight)))
    .limit(500);
  let settled = 0;
  let waiting = 0;
  let mismatched = 0;
  for (const item of sent) {
    if (!isFinal(item.sendHeight!, p.tipHeight, p.nu7ActivationHeight)) {
      waiting++;
      continue;
    }
    if (p.verifyOwnership) {
      const info = item.transferInscriptionId ? await p.indexer.inscription(item.transferInscriptionId) : null;
      if (!info || info.owner !== item.address) {
        mismatched++;
        await recordAlert(db, "high", "payout_unverified", `Payout ${item.id} is final but Zord does not show it at ${item.address}`);
        continue;
      }
    }
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(payoutItems).where(eq(payoutItems.id, item.id)).for("update");
      if (locked?.status !== "sent") return;
      await postLedgerTx(tx, {
        idempotencyKey: `payout:${item.batchId}:${item.userId}`,
        kind: "payout_settled",
        refType: "payout_item",
        refId: item.id,
        actor: "worker",
        memo: item.sendTxid ?? undefined,
        entries: [
          { account: "payout_pending", amount: -BigInt(item.amount) },
          { account: "treasury_backing", amount: BigInt(item.amount) },
        ],
      });
      await tx.update(payoutItems).set({ status: "settled", updatedAt: new Date() }).where(eq(payoutItems.id, item.id));
    });
    settled++;
  }

  const failed = await db.select().from(payoutItems).where(eq(payoutItems.status, "failed")).limit(500);
  let returned = 0;
  for (const item of failed) {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(payoutItems).where(eq(payoutItems.id, item.id)).for("update");
      if (locked?.status !== "failed") return;
      await postLedgerTx(tx, {
        idempotencyKey: `payout-return:${item.batchId}:${item.userId}`,
        kind: "payout_returned",
        refType: "payout_item",
        refId: item.id,
        actor: "worker",
        memo: item.error ?? "payout failed",
        entries: [
          { account: "payout_pending", amount: -BigInt(item.amount) },
          { account: userAccountCode(item.userId), amount: BigInt(item.amount) },
        ],
      });
      await tx.update(payoutItems).set({ status: "returned", updatedAt: new Date() }).where(eq(payoutItems.id, item.id));
    });
    returned++;
  }

  // Close batches whose items are all final.
  const open = await db
    .select({ id: payoutBatches.id })
    .from(payoutBatches)
    .where(inArray(payoutBatches.status, ["approved", "sending"]));
  let completed = 0;
  for (const b of open) {
    const [left] = await db
      .select({ n: sql<number>`count(*)` })
      .from(payoutItems)
      .where(and(eq(payoutItems.batchId, b.id), sql`${payoutItems.status} not in ('settled','returned')`));
    if (Number(left?.n ?? 0) === 0) {
      await db.update(payoutBatches).set({ status: "done", completedAt: new Date() }).where(eq(payoutBatches.id, b.id));
      completed++;
    }
  }
  return { settled, waiting, mismatched, returned, completed };
}

/**
 * DEVELOPMENT ONLY (ZORD_MODE=mock): stands in for the Rust signer so the whole pipeline can be
 * exercised locally. It never builds or broadcasts a transaction.
 */
export async function simulateSigner(db: Database, p: { height: number }) {
  if (process.env.NODE_ENV === "production" || process.env.ZORD_MODE !== "mock") {
    throw new Error("simulateSigner is only available in development with ZORD_MODE=mock");
  }
  const items = await db
    .select({ item: payoutItems })
    .from(payoutItems)
    .innerJoin(payoutBatches, eq(payoutBatches.id, payoutItems.batchId))
    .where(and(eq(payoutItems.status, "approved"), inArray(payoutBatches.status, ["approved", "sending"])))
    .limit(200);
  for (const { item } of items) {
    const fake = () => `mock${randomBytes(30).toString("hex")}`;
    await db
      .update(payoutItems)
      .set({
        status: "sent",
        inscribeTxid: fake(),
        sendTxid: fake(),
        transferInscriptionId: `${fake()}i0`,
        sendHeight: p.height,
        attempts: item.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(payoutItems.id, item.id));
    await db.update(payoutBatches).set({ status: "sending" }).where(and(eq(payoutBatches.id, item.batchId), eq(payoutBatches.status, "approved")));
  }
  return { sent: items.length };
}

export async function batchOverview(db: DbOrTx, batchId?: string) {
  const [batch] = batchId
    ? await db.select().from(payoutBatches).where(eq(payoutBatches.id, batchId))
    : await db.select().from(payoutBatches).orderBy(desc(payoutBatches.createdAt)).limit(1);
  if (!batch) return null;
  const counts = await db
    .select({ status: payoutItems.status, n: sql<number>`count(*)`, total: sql<string>`coalesce(sum(${payoutItems.amount}),0)` })
    .from(payoutItems)
    .where(eq(payoutItems.batchId, batch.id))
    .groupBy(payoutItems.status);
  return {
    id: batch.id,
    week: batch.week,
    status: batch.status,
    heldReason: batch.heldReason,
    recipients: batch.recipients,
    total: String(batch.totalAmount),
    feeZats: batch.feeZats,
    approvedAt: batch.approvedAt?.toISOString() ?? null,
    createdAt: batch.createdAt.toISOString(),
    items: Object.fromEntries(counts.map((c) => [c.status, { count: Number(c.n), total: String(c.total) }])) as Partial<
      Record<PayoutItemStatus, { count: number; total: string }>
    >,
  };
}

export async function listBatches(db: DbOrTx, limit = 12) {
  const rows = await db.select().from(payoutBatches).orderBy(desc(payoutBatches.createdAt)).limit(limit);
  return rows.map((b) => ({
    id: b.id,
    week: b.week,
    status: b.status,
    recipients: b.recipients,
    total: String(b.totalAmount),
    feeZats: b.feeZats,
    heldReason: b.heldReason,
    createdAt: b.createdAt.toISOString(),
  }));
}
