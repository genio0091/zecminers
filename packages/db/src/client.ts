import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

// BIGINT (int8) arrives as a string by default; keep it that way and convert at the edges.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => v);

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
  close(): Promise<void>;
}

const defaultMax = Number(process.env.DB_POOL_MAX ?? (process.env.VERCEL ? 3 : 10));

/**
 * On Vercel + Neon use the *pooled* DATABASE_URL here (…-pooler.…neon.tech) and keep the pool
 * small; migrations use DATABASE_URL_UNPOOLED. Neon URLs carry sslmode=require.
 */
export function createDb(url = process.env.DATABASE_URL, max = defaultMax): DbHandle {
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}

const globalForDb = globalThis as unknown as { __zecminersDb?: DbHandle };

/** One pool per process (survives Next.js dev hot reloads). */
export function getDb(): Database {
  if (!globalForDb.__zecminersDb) globalForDb.__zecminersDb = createDb();
  return globalForDb.__zecminersDb.db;
}

export { schema };
