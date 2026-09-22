import { blockHashAt, currentTipHeight, drawRaffle, GameError, tables } from "@zecminers/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Draw after block H: read its hash from our Zebra node, compute winners, reveal the seed. */
export const POST = route({ access: "admin", mutation: true, body: Body }, async (ctx) => {
  const raffleId = Number(ctx.params.id);
  const [raffle] = await ctx.db.select().from(tables.raffles).where(eq(tables.raffles.id, raffleId));
  if (!raffle) throw new GameError("NOT_FOUND", "Raffle not found.");
  const c = chain();
  const tip = await currentTipHeight(c);
  if (tip < raffle.closeBlockHeight) throw new GameError("RAFFLE_NOT_READY", `Block ${raffle.closeBlockHeight} is not mined yet (tip ${tip}).`);
  const blockHash = await blockHashAt(c, raffle.closeBlockHeight);
  return drawRaffle(ctx.db, { adminId: requireUser(ctx).id, raffleId, blockHash, tipHeight: tip, reason: ctx.body.reason });
});
