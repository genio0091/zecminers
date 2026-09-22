import { ledgerHistory } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

/** Cursor-paginated ledger history for the signed-in player. */
export const GET = route({ access: "user" }, async (ctx) => {
  const cursor = Number(ctx.req.nextUrl.searchParams.get("cursor") ?? "") || undefined;
  const limit = Number(ctx.req.nextUrl.searchParams.get("limit") ?? "") || 25;
  return ledgerHistory(ctx.db, requireUser(ctx).id, cursor, limit);
});
