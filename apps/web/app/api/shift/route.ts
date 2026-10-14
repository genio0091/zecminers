import { getShift } from "@hoodvalley/db";
import { requireUser, route } from "@/lib/api";

/** Valley HQ: the shift clock, your Miners, Season 1 progress, streak, raffle entries and activity. */
export const GET = route({ access: "user" }, async (ctx) => getShift(ctx.db, requireUser(ctx).id, ctx.now));
