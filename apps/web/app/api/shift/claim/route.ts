import { claimMiners } from "@hoodvalley/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ slotIds: z.array(z.uuid()).max(50).optional() });

/** Claim every finished shift (or just the picked Miners). Each share is paid exactly once. */
export const POST = route({ access: "user", mutation: true, body: Body, rate: { name: "shift", limit: 30, windowSec: 60 } }, async (ctx) =>
  claimMiners(ctx.db, { userId: requireUser(ctx).id, slotIds: ctx.body.slotIds, now: ctx.now }),
);
