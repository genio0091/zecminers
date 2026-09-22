import { startSession } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

/** Start today's session. Idempotent through the unique (slot_id, day) key. */
export const POST = route({ access: "user", mutation: true, rate: { name: "slot", limit: 30, windowSec: 60 } }, async (ctx) =>
  startSession(ctx.db, { userId: requireUser(ctx).id, slotId: ctx.params.id!, now: ctx.now }),
);
