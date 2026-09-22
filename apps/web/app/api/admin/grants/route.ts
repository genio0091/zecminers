import { grantFromMarketing } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({
  userId: z.uuid(),
  amount: z.string().regex(/^[1-9]\d{0,11}$/),
  reason: z.string().trim().min(3).max(300),
});

/** Grant from the marketing pool (prizes, campaigns). Always audited. */
export const POST = route({ access: "admin", mutation: true, idempotency: true, body: Body }, async (ctx) =>
  grantFromMarketing(ctx.db, {
    adminId: requireUser(ctx).id,
    userId: ctx.body.userId,
    amount: BigInt(ctx.body.amount),
    reason: ctx.body.reason,
    idempotencyKey: ctx.idempotencyKey!,
  }),
);
