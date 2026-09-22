import { ORES } from "@zecminers/economy";
import { exchangeOre } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ item: z.enum(ORES), qty: z.number().int().min(1).max(10_000) });

/** Swap ore for $ZGEMS at the configured shop rate. */
export const POST = route(
  { access: "user", mutation: true, idempotency: true, body: Body, rate: { name: "shop", limit: 20, windowSec: 60 } },
  async (ctx) =>
    exchangeOre(ctx.db, { userId: requireUser(ctx).id, item: ctx.body.item, qty: ctx.body.qty, idempotencyKey: ctx.idempotencyKey!, now: ctx.now }),
);
