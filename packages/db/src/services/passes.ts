import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { durabilityMax } from "@zecminers/economy";
import { ADDRESS_ERROR_MESSAGES, checkTransparentAddress, type ZcashNetwork } from "@zecminers/zcash";
import type { ChainIndexer } from "@zecminers/zord-client";
import { and, asc, count, eq, inArray, isNotNull, lt, or, isNull, sql } from "drizzle-orm";
import type { Database, DbOrTx } from "../client";
import { GameError } from "../errors";
import { ensureUserAccount } from "../ledger";
import { passes, slots, users } from "../schema";
import { audit, getActiveConfig, recordAlert } from "../system";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

export function normalizeClaimCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** One-time claim code in the form ZM-XXXX-XXXX, sent by DM with the airdrop (blueprint §6.7). */
export function generateClaimCode(): string {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `ZM-${block()}-${block()}`;
}

export function hashClaimCode(code: string, pepper: string): string {
  if (!pepper || pepper.length < 16) throw new Error("CLAIM_CODE_PEPPER must be at least 16 characters");
  return createHmac("sha256", pepper).update(normalizeClaimCode(code)).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export interface PassImportLine {
  address: string;
  inscriptionId?: string;
  note?: string;
}

export interface PassImportResult {
  dryRun: boolean;
  created: { passNumber: number; address: string; claimCode: string; inscriptionId: string | null }[];
  rejected: { line: number; address: string; reason: string }[];
}

/** Admin: import winner addresses and generate claim codes. Codes are only ever shown here. */
export async function importPasses(
  db: Database,
  p: { adminId: string; lines: PassImportLine[]; reason: string; pepper: string; network: ZcashNetwork; dryRun: boolean },
): Promise<PassImportResult> {
  return db.transaction(async (tx) => {
    const rejected: PassImportResult["rejected"] = [];
    const seen = new Set<string>();
    const valid: PassImportLine[] = [];
    p.lines.forEach((l, i) => {
      const address = l.address.trim();
      const check = checkTransparentAddress(address, { network: p.network });
      if (!check.ok) return rejected.push({ line: i + 1, address, reason: ADDRESS_ERROR_MESSAGES[check.reason] });
      if (seen.has(address)) return rejected.push({ line: i + 1, address, reason: "duplicate in this import" });
      seen.add(address);
      valid.push({ ...l, address });
    });
    if (valid.length) {
      const existing = await tx
        .select({ address: passes.originAddress })
        .from(passes)
        .where(inArray(passes.originAddress, valid.map((v) => v.address)));
      for (const e of existing) {
        const idx = valid.findIndex((v) => v.address === e.address);
        if (idx >= 0) {
          rejected.push({ line: p.lines.findIndex((l) => l.address.trim() === e.address) + 1, address: e.address, reason: "address already has a pass" });
          valid.splice(idx, 1);
        }
      }
    }
    const [maxRow] = await tx.select({ max: sql<number>`coalesce(max(${passes.passNumber}), 0)` }).from(passes);
    let next = Number(maxRow?.max ?? 0) + 1;
    const created: PassImportResult["created"] = [];
    for (const v of valid) {
      const claimCode = generateClaimCode();
      created.push({ passNumber: next, address: v.address, claimCode, inscriptionId: v.inscriptionId ?? null });
      if (!p.dryRun) {
        await tx.insert(passes).values({
          passNumber: next,
          originAddress: v.address,
          inscriptionId: v.inscriptionId || null,
          claimCodeHash: hashClaimCode(claimCode, p.pepper),
          note: v.note,
        });
      }
      next++;
    }
    if (!p.dryRun) {
      await audit(tx, {
        adminId: p.adminId,
        action: "passes.import",
        payload: { count: created.length, rejected: rejected.length, passNumbers: created.map((c) => c.passNumber) },
        reason: p.reason,
      });
    }
    return { dryRun: p.dryRun, created, rejected };
  });
}

/** Player: link the airdrop address with the one-time claim code (blueprint §7.1–7.2). */
export async function linkWallet(
  db: Database,
  p: { userId: string; address: string; claimCode: string; pepper: string; network: ZcashNetwork; maxPassesPerAccount: number; now: Date },
) {
  const address = p.address.trim();
  const check = checkTransparentAddress(address, { network: p.network });
  if (!check.ok) throw new GameError("INVALID_ADDRESS", ADDRESS_ERROR_MESSAGES[check.reason]);
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, p.userId)).limit(1).for("update");
    if (!user) throw new GameError("UNAUTHORIZED");
    if (user.status === "frozen") throw new GameError("ACCOUNT_FROZEN");
    if (user.walletAddress && user.walletAddress !== address) {
      throw new GameError("WALLET_ALREADY_LINKED", "This account already has a linked address.");
    }
    const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.walletAddress, address)).limit(1);
    if (owner && owner.id !== p.userId) throw new GameError("ADDRESS_TAKEN", "That address is linked to another account.");

    const [pass] = await tx.select().from(passes).where(eq(passes.originAddress, address)).limit(1).for("update");
    const invalid = new GameError("INVALID_CLAIM", "Address or claim code not recognised. Codes are single use.");
    if (!pass || pass.status !== "unclaimed" || !pass.claimCodeHash) throw invalid;
    if (!safeEqualHex(hashClaimCode(p.claimCode, p.pepper), pass.claimCodeHash)) throw invalid;

    const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(passes).where(eq(passes.userId, p.userId));
    if (Number(n) >= p.maxPassesPerAccount) throw new GameError("CONFLICT", "This account already holds the maximum number of passes.");

    await tx.update(users).set({ walletAddress: address, walletLinkedAt: p.now }).where(eq(users.id, p.userId));
    await tx
      .update(passes)
      .set({ userId: p.userId, status: "active", claimCodeHash: null, claimCodeUsedAt: p.now })
      .where(eq(passes.id, pass.id));
    await ensureUserAccount(tx, p.userId);
    const cfg = await getActiveConfig(tx, p.now);
    const [slot] = await tx
      .insert(slots)
      .values({ userId: p.userId, passId: pass.id, level: 1, durability: durabilityMax(cfg.params, 1), state: "idle" })
      .onConflictDoNothing({ target: slots.passId })
      .returning({ id: slots.id });
    return { passId: pass.id, passNumber: pass.passNumber, address, slotId: slot?.id ?? null };
  });
}

export async function deactivatePass(db: Database, p: { adminId: string; passId: string; reason: string }) {
  return db.transaction(async (tx) => {
    const [pass] = await tx.select().from(passes).where(eq(passes.id, p.passId)).for("update");
    if (!pass) throw new GameError("NOT_FOUND", "Pass not found.");
    await tx.update(passes).set({ status: "deactivated", statusReason: p.reason }).where(eq(passes.id, pass.id));
    await audit(tx, { adminId: p.adminId, action: "pass.deactivate", payload: { passId: pass.id, passNumber: pass.passNumber }, reason: p.reason });
    return { passId: pass.id, status: "deactivated" as const };
  });
}

export async function setPassInscription(db: Database, p: { adminId: string; passId: string; inscriptionId: string; reason: string }) {
  return db.transaction(async (tx) => {
    const [pass] = await tx.select().from(passes).where(eq(passes.id, p.passId)).for("update");
    if (!pass) throw new GameError("NOT_FOUND", "Pass not found.");
    await tx.update(passes).set({ inscriptionId: p.inscriptionId.trim() }).where(eq(passes.id, pass.id));
    await audit(tx, { adminId: p.adminId, action: "pass.set_inscription", payload: { passId: pass.id, inscriptionId: p.inscriptionId }, reason: p.reason });
    return { passId: pass.id, inscriptionId: p.inscriptionId };
  });
}

/**
 * Worker, hourly (blueprint §7.2): the pass only mines while Zord says its owner is still the
 * origin address. Anything else marks it `moved` — permanently.
 */
export async function checkPassOwners(db: DbOrTx, indexer: ChainIndexer, now: Date, batchSize = 200) {
  const due = await db
    .select()
    .from(passes)
    .where(
      and(
        eq(passes.status, "active"),
        isNotNull(passes.inscriptionId),
        or(isNull(passes.lastOwnerCheckAt), lt(passes.lastOwnerCheckAt, new Date(now.getTime() - 55 * 60_000))),
      ),
    )
    .orderBy(asc(passes.lastOwnerCheckAt))
    .limit(batchSize);
  let checked = 0;
  let moved = 0;
  let errors = 0;
  for (const pass of due) {
    try {
      const info = await indexer.inscription(pass.inscriptionId!);
      checked++;
      if (!info) {
        errors++;
        await recordAlert(db, "high", "pass_missing", `Pass #${pass.passNumber} inscription ${pass.inscriptionId} not found in Zord`);
        await db.update(passes).set({ lastOwnerCheckAt: now }).where(eq(passes.id, pass.id));
        continue;
      }
      if (info.owner !== pass.originAddress) {
        moved++;
        await db
          .update(passes)
          .set({ status: "moved", statusReason: `owner is ${info.owner}`, lastOwnerCheckAt: now, lastSeenOwner: info.owner })
          .where(eq(passes.id, pass.id));
        await recordAlert(db, "info", "pass_moved", `Pass #${pass.passNumber} moved from ${pass.originAddress} to ${info.owner}; slot stopped`);
      } else {
        await db.update(passes).set({ lastOwnerCheckAt: now, lastSeenOwner: info.owner }).where(eq(passes.id, pass.id));
      }
    } catch (err) {
      errors++;
      await recordAlert(db, "medium", "pass_check_error", `Pass #${pass.passNumber}: ${(err as Error).message}`);
    }
  }
  return { due: due.length, checked, moved, errors };
}
