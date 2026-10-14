import { gearUpMiners } from "@hoodvalley/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ slotIds: z.array(z.uuid()).max(50).optional() });

/** Gear up claimed Miners for the next shift; the first gear-up of a day extends the streak. */
export const POST = route({ access: "user", mutation: true, body: Body, rate: { name: "shift", limit: 30, windowSec: 60 } }, async (ctx) =>
  gearUpMiners(ctx.db, { userId: requireUser(ctx).id, slotIds: ctx.body.slotIds, now: ctx.now }),
);
