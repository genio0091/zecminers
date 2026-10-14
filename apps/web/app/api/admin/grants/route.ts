import { grantFromCommunity } from "@hoodvalley/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({
  userId: z.uuid(),
  amount: z.string().regex(/^[1-9]\d{0,11}$/),
  reason: z.string().trim().min(3).max(300),
});

/** Grant from the community pool (holder benefits, airdrops). Always audited. */
export const POST = route({ access: "admin", mutation: true, idempotency: true, body: Body }, async (ctx) =>
  grantFromCommunity(ctx.db, {
    adminId: requireUser(ctx).id,
    userId: ctx.body.userId,
    amount: BigInt(ctx.body.amount),
    reason: ctx.body.reason,
    idempotencyKey: ctx.idempotencyKey!,
  }),
);
