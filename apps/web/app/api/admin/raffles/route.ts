import { createRaffle, currentTipHeight } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";

const Body = z.object({
  title: z.string().trim().min(3).max(80),
  ticketPrice: z.string().regex(/^\d+$/),
  prizeAmount: z.string().regex(/^\d+$/),
  winnerCount: z.number().int().min(1).max(20),
  closeBlockHeight: z.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

/** Open a raffle: publishes sha256(seed) and the closing block height H. */
export const POST = route({ access: "admin", mutation: true, body: Body }, async (ctx) => {
  const tip = await currentTipHeight(chain()).catch(() => null);
  return createRaffle(ctx.db, {
    adminId: requireUser(ctx).id,
    title: ctx.body.title,
    ticketPrice: BigInt(ctx.body.ticketPrice),
    prizeAmount: BigInt(ctx.body.prizeAmount),
    winnerCount: ctx.body.winnerCount,
    closeBlockHeight: ctx.body.closeBlockHeight,
    tipHeight: tip,
    reason: ctx.body.reason,
  });
});
