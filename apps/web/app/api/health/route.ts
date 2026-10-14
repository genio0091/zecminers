import { getMaintenance } from "@hoodvalley/db";
import { sql } from "drizzle-orm";
import { route } from "@/lib/api";

export const GET = route({ access: "public" }, async ({ db }) => {
  await db.execute(sql`select 1`);
  const m = await getMaintenance(db);
  // `shift_days` arrives with the Hood Valley migration (0003); its absence means a migration is pending.
  const res = await db.execute<{ ok: boolean }>(sql`select to_regclass('public.shift_days') is not null as ok`);
  return { status: "ok", maintenance: m.on, schema: res.rows[0]?.ok ? "current" : "migration pending" };
});
