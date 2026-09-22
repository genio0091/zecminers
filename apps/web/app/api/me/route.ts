import { getMe } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

export const GET = route({ access: "user" }, async (ctx) => getMe(ctx.db, requireUser(ctx).id, ctx.now));
