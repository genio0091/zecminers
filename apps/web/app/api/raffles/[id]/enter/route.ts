import { currentTipHeight, enterHolderRaffle, GameError } from "@hoodvalley/db";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";

/** Holder raffle: one free entry per active Valley Miner, once per draw. */
export const POST = route({ access: "user", mutation: true, rate: { name: "raffle", limit: 10, windowSec: 60 } }, async (ctx) => {
  const raffleId = Number(ctx.params.id);
  if (!Number.isInteger(raffleId)) throw new GameError("NOT_FOUND", "Raffle not found.");
  const tip = await currentTipHeight(chain()).catch(() => null);
  return enterHolderRaffle(ctx.db, { userId: requireUser(ctx).id, raffleId, tipHeight: tip, now: ctx.now });
});
