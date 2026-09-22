import { getRegistry, payoutHistory } from "@zecminers/db";
import { requireUser, route } from "@/lib/api";

export const GET = route({ access: "user" }, async (ctx) => {
  const [rows, reg] = await Promise.all([payoutHistory(ctx.db, requireUser(ctx).id), getRegistry(ctx.db)]);
  return { payouts: rows, explorerBaseUrl: reg.explorer_base_url ?? null };
});
