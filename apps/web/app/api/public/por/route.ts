import { ok, route } from "@/lib/api";
import { publicReserves } from "@/lib/public-data";

/** Latest proof-of-reserves snapshot + live treasury (cached 5 min). */
export const GET = route({ access: "public" }, async ({ now }) =>
  ok(await publicReserves(), now, { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" }),
);
