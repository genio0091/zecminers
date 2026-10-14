import { deployMiners } from "@hoodvalley/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ slotIds: z.array(z.uuid()).min(1).max(50) });

/** Deploy ready Miners into the open window. One shift per Miner per day, enforced by the database. */
export const POST = route({ access: "user", mutation: true, body: Body, rate: { name: "shift", limit: 30, windowSec: 60 } }, async (ctx) =>
  deployMiners(ctx.db, { userId: requireUser(ctx).id, slotIds: ctx.body.slotIds, now: ctx.now }),
);
