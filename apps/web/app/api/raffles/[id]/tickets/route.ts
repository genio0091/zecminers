import { buyRaffleTickets, currentTipHeight, GameError } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";

const Body = z.object({ count: z.number().int().min(1).max(100) });

/** Buy raffle tickets with in-game $ZGEMS (a sink). Turnstile + Idempotency-Key. */
export const POST = route(
  { access: "user", mutation: true, idempotency: true, turnstile: true, body: Body, rate: { name: "raffle", limit: 10, windowSec: 60 } },
  async (ctx) => {
    const raffleId = Number(ctx.params.id);
    if (!Number.isInteger(raffleId)) throw new GameError("NOT_FOUND", "Raffle not found.");
    const tip = await currentTipHeight(chain()).catch(() => null);
    return buyRaffleTickets(ctx.db, {
      userId: requireUser(ctx).id,
      raffleId,
      count: ctx.body.count,
      idempotencyKey: ctx.idempotencyKey!,
      tipHeight: tip,
      now: ctx.now,
    });
  },
);
