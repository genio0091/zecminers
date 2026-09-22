import { listRaffles, myTickets } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";
import { currentTipHeight } from "@zecminers/db";

/** Raffles with the signed-in player's ticket ranges and the current block height. */
export const GET = route({ access: "user" }, async (ctx) => {
  const raffles = await listRaffles(ctx.db, 20);
  const mine = await myTickets(ctx.db, requireUser(ctx).id, raffles.map((r) => r.id));
  const tipHeight = await currentTipHeight(chain()).catch(() => null);
  return { raffles, mine, tipHeight };
});
