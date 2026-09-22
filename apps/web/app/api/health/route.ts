import { getMaintenance } from "@zecminers/db";
import { sql } from "drizzle-orm";
import { route } from "@/lib/api";

export const GET = route({ access: "public" }, async ({ db }) => {
  await db.execute(sql`select 1`);
  const m = await getMaintenance(db);
  return { status: "ok", maintenance: m.on };
});
