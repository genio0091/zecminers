import { listSlots } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

export const GET = route({ access: "user" }, async (ctx) => listSlots(ctx.db, requireUser(ctx).id, ctx.now));
