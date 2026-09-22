import { randomBytes } from "node:crypto";
import { drawWinners, seedCommitment, ticketOwner } from "@zecminers/economy";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Database, DbOrTx } from "../client";
import { GameError } from "../errors";
import { ensureUserAccount, postLedgerTx, userAccountCode } from "../ledger";
import { raffles, raffleTickets } from "../schema";
import { audit } from "../system";

/** Commit phase (blueprint §7.6): publish sha256(seed) and the closing block height. */
export async function createRaffle(
  db: Database,
  p: {
    adminId: string;
    title: string;
    ticketPrice: bigint;
    prizeAmount: bigint;
    winnerCount: number;
    closeBlockHeight: number;
    tipHeight: number | null;
    reason: string;
  },
) {
  if (p.tipHeight !== null && p.closeBlockHeight <= p.tipHeight + 10) {
    throw new GameError("VALIDATION", "Close height must be at least 10 blocks in the future.");
  }
  const seed = randomBytes(32).toString("hex");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(raffles)
      .values({
        title: p.title,
        seed,
        seedHash: seedCommitment(seed),
        closeBlockHeight: p.closeBlockHeight,
        ticketPrice: p.ticketPrice,
        prizeAmount: p.prizeAmount,
        winnerCount: p.winnerCount,
      })
      .returning({ id: raffles.id, seedHash: raffles.seedHash });
    await audit(tx, {
      adminId: p.adminId,
      action: "raffle.create",
      payload: { raffleId: row!.id, seedHash: row!.seedHash, closeBlockHeight: p.closeBlockHeight, prize: String(p.prizeAmount) },
      reason: p.reason,
    });
    return { id: row!.id, seedHash: row!.seedHash, closeBlockHeight: p.closeBlockHeight };
  });
}

/** Worker: stop ticket sales once the chain is one block away from H. */
export async function closeDueRaffles(db: DbOrTx, tipHeight: number) {
  const open = await db.select().from(raffles).where(eq(raffles.status, "open"));
  let closed = 0;
  for (const r of open) {
    if (tipHeight >= r.closeBlockHeight - 1) {
      await db.update(raffles).set({ status: "closed" }).where(eq(raffles.id, r.id));
      closed++;
    }
  }
  return closed;
}

/**
 * Reveal phase: after block H exists, compute winners from HMAC_SHA256(seed, blockhash_H ‖ id),
 * pay prizes from the marketing pool and publish the seed.
 */
export async function drawRaffle(
  db: Database,
  p: { adminId: string; raffleId: number; blockHash: string; tipHeight: number; reason: string },
) {
  if (!/^[0-9a-f]{64}$/i.test(p.blockHash)) throw new GameError("VALIDATION", "Block hash must be 32 bytes of hex.");
  return db.transaction(async (tx) => {
    const [raffle] = await tx.select().from(raffles).where(eq(raffles.id, p.raffleId)).for("update");
    if (!raffle) throw new GameError("NOT_FOUND", "Raffle not found.");
    if (raffle.status === "drawn") throw new GameError("CONFLICT", "Raffle already drawn.");
    if (raffle.status === "cancelled") throw new GameError("RAFFLE_CLOSED", "Raffle was cancelled.");
    if (p.tipHeight < raffle.closeBlockHeight) {
      throw new GameError("RAFFLE_NOT_READY", `Block ${raffle.closeBlockHeight} has not been mined yet.`);
    }
    const tickets = await tx
      .select()
      .from(raffleTickets)
      .where(eq(raffleTickets.raffleId, raffle.id))
      .orderBy(asc(raffleTickets.startIndex));
    const winners: { index: number; userId: string; prize: string }[] = [];
    if (raffle.totalTickets > 0) {
      const indexes = drawWinners(raffle.seed, p.blockHash, raffle.id, raffle.totalTickets, raffle.winnerCount);
      const prizeEach = raffle.winnerCount > 0 ? BigInt(raffle.prizeAmount) / BigInt(indexes.length) : 0n;
      for (const [k, index] of indexes.entries()) {
        const owner = ticketOwner(tickets, index);
        if (!owner) throw new GameError("INTERNAL", `ticket ${index} has no owner`);
        winners.push({ index, userId: owner.userId, prize: prizeEach.toString() });
        if (prizeEach > 0n) {
          await ensureUserAccount(tx, owner.userId);
          await postLedgerTx(tx, {
            idempotencyKey: `raffle-prize:${raffle.id}:${k}`,
            kind: "raffle_prize",
            refType: "raffle",
            refId: String(raffle.id),
            actor: p.adminId,
            memo: `raffle #${raffle.id} winner ${k + 1}`,
            entries: [
              { account: "pool_marketing", amount: -prizeEach },
              { account: userAccountCode(owner.userId), amount: prizeEach },
            ],
          });
        }
      }
    }
    await tx
      .update(raffles)
      .set({ status: "drawn", blockHash: p.blockHash.toLowerCase(), winners, drawnAt: new Date() })
      .where(eq(raffles.id, raffle.id));
    await audit(tx, { adminId: p.adminId, action: "raffle.draw", payload: { raffleId: raffle.id, winners }, reason: p.reason });
    return { raffleId: raffle.id, winners, seed: raffle.seed, blockHash: p.blockHash.toLowerCase() };
  });
}

/** Public view: the seed is only included once the raffle is drawn. */
export function publicRaffle(r: typeof raffles.$inferSelect) {
  const drawn = r.status === "drawn";
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    seedHash: r.seedHash,
    seed: drawn ? r.seed : null,
    closeBlockHeight: r.closeBlockHeight,
    blockHash: r.blockHash,
    ticketPrice: String(r.ticketPrice),
    prizeAmount: String(r.prizeAmount),
    winnerCount: r.winnerCount,
    totalTickets: r.totalTickets,
    winners: drawn ? r.winners : null,
    createdAt: r.createdAt.toISOString(),
    drawnAt: r.drawnAt?.toISOString() ?? null,
  };
}

export async function listRaffles(db: DbOrTx, limit = 20) {
  const rows = await db.select().from(raffles).orderBy(desc(raffles.id)).limit(limit);
  return rows.map(publicRaffle);
}

export async function raffleVerification(db: DbOrTx, raffleId: number) {
  const [r] = await db.select().from(raffles).where(eq(raffles.id, raffleId));
  if (!r) throw new GameError("NOT_FOUND", "Raffle not found.");
  const tickets = await db
    .select({ userId: raffleTickets.userId, startIndex: raffleTickets.startIndex, count: raffleTickets.count })
    .from(raffleTickets)
    .where(eq(raffleTickets.raffleId, r.id))
    .orderBy(asc(raffleTickets.startIndex));
  return {
    raffle: publicRaffle(r),
    // User ids are opaque UUIDs; publishing ranges lets anyone map the winning index to a ticket.
    tickets,
    formula: "winner = HMAC_SHA256(key = seed bytes, msg = utf8(blockHashHex + raffleId)) mod totalTickets",
  };
}

export async function myTickets(db: DbOrTx, userId: string, raffleIds: number[]) {
  if (!raffleIds.length) return [];
  return db
    .select({ raffleId: raffleTickets.raffleId, startIndex: raffleTickets.startIndex, count: raffleTickets.count })
    .from(raffleTickets)
    .where(and(eq(raffleTickets.userId, userId), inArray(raffleTickets.raffleId, raffleIds)));
}
