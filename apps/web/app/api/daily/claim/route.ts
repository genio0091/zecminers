import { claimDaily } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

export const POST = route({ access: "user", mutation: true, rate: { name: "daily", limit: 10, windowSec: 60 } }, async (ctx) =>
  claimDaily(ctx.db, { userId: requireUser(ctx).id, now: ctx.now }),
);
