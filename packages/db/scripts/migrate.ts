/**
 * Applies drizzle/ migrations. On Vercel + Neon, run against the *unpooled* URL:
 *   DATABASE_URL_UNPOOLED=... pnpm db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL_UNPOOLED (preferred for Neon) or DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
const host = new URL(url).host;
console.log(`Migrating ${host} …`);
await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
const { rows } = await pool.query<{ n: string }>(
  "select count(*) as n from information_schema.tables where table_schema = 'public'",
);
console.log(`Done. ${rows[0]?.n} tables in public schema.`);
await pool.end();
