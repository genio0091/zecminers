import { repairSlot } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

export const POST = route(
  { access: "user", mutation: true, idempotency: true, rate: { name: "slot", limit: 30, windowSec: 60 } },
  async (ctx) => repairSlot(ctx.db, { userId: requireUser(ctx).id, slotId: ctx.params.id!, idempotencyKey: ctx.idempotencyKey!, now: ctx.now }),
);
