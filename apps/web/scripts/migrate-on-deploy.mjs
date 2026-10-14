/**
 * Production deploys on Vercel apply pending database migrations before `next build`, so new
 * code never runs against an older schema. Migrations are idempotent (drizzle journal) and
 * additive; if one fails the build fails and the previous deployment stays live.
 * Preview and local builds skip this step.
 */
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] not a production deploy, skipping");
  process.exit(0);
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] no database URL, skipping");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
console.log(`[migrate] migrating ${new URL(url).host} …`);
await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL("../../../packages/db/drizzle", import.meta.url)) });
await pool.end();
console.log("[migrate] done");
