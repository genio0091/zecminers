import { collectSession } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

/** Credit what the server computed and end the session. The client never sends an amount. */
export const POST = route({ access: "user", mutation: true, rate: { name: "slot", limit: 30, windowSec: 60 } }, async (ctx) =>
  collectSession(ctx.db, { userId: requireUser(ctx).id, slotId: ctx.params.id!, now: ctx.now }),
);
