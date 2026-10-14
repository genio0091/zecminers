import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { DEV_ECONOMY_PARAMS } from "@hoodvalley/economy";
import { encodeTransparentAddress } from "@hoodvalley/zcash";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { createDb, ensureSystemAccounts, hashClaimCode, postGenesis, publishConfig, tables, type DbHandle } from "../src";

export const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/zecminers_test";
export const PEPPER = "test-pepper-0123456789abcdef";

export async function dbAvailable(): Promise<boolean> {
  const c = new pg.Client({ connectionString: TEST_URL, connectionTimeoutMillis: 1500 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

/** Season 1 for the tests: starts well before the test dates; payout limits out of the way. */
export const TEST_PARAMS = {
  ...DEV_ECONOMY_PARAMS,
  seasonStart: "2026-09-01",
  payout: { ...DEV_ECONOMY_PARAMS.payout, maxPerUser: 1_000_000_000, maxPerBatch: 9_000_000_000 },
};

/** Fresh schema: drop everything, run migrations and (by default) post the Hood Valley genesis. */
export async function freshDb(opts: { genesis?: boolean } = {}): Promise<DbHandle> {
  const admin = new pg.Pool({ connectionString: TEST_URL, max: 1 });
  await admin.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await migrate(drizzle(admin), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  await admin.end();
  const handle = createDb(TEST_URL, 20);
  await handle.db.transaction(async (tx) => {
    await ensureSystemAccounts(tx);
    await publishConfig(tx, TEST_PARAMS, { activeFrom: new Date(0), createdBy: "test" });
    if (opts.genesis !== false) await postGenesis(tx, "test");
  });
  return handle;
}

export function addr(label: string) {
  return encodeTransparentAddress(createHash("sha256").update(label).digest().subarray(0, 20));
}

let n = 0;
/** A user with an unclaimed pass (claim code ZM-AAAA-BBBB). */
export async function playerWithPass(h: DbHandle, label = `p${++n}`) {
  const { db } = h;
  const [user] = await db.insert(tables.users).values({ discordId: `d-${label}-${Date.now()}`, discordUsername: label }).returning();
  const address = addr(`${label}-${Date.now()}`);
  const [pass] = await db
    .insert(tables.passes)
    .values({ passNumber: Math.floor(Math.random() * 1e9), originAddress: address, claimCodeHash: hashClaimCode("ZM-AAAA-BBBB", PEPPER) })
    .returning();
  return { user: user!, pass: pass!, address };
}
