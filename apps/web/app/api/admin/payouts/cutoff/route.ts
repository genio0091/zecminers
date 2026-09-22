import { audit, createWeeklyBatch, getFreezeWindows } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Run the weekly cutoff now (normally scheduled). Idempotent per ISO week. */
export const POST = route({ access: "admin", mutation: true, body: Body }, async (ctx) => {
  const admin = requireUser(ctx);
  await audit(ctx.db, { adminId: admin.id, action: "payout.cutoff_manual", payload: {}, reason: ctx.body.reason });
  return createWeeklyBatch(ctx.db, { now: ctx.now, freezeWindows: await getFreezeWindows(ctx.db), actor: `admin:${admin.id}` });
});
