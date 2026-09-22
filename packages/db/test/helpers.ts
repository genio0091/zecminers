import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { DEV_ECONOMY_PARAMS } from "@zecminers/economy";
import { encodeTransparentAddress } from "@zecminers/zcash";
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

/** Fresh schema per test file: drop everything, run migrations, post genesis. */
export async function freshDb(): Promise<DbHandle> {
  const admin = new pg.Pool({ connectionString: TEST_URL, max: 1 });
  await admin.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await migrate(drizzle(admin), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  await admin.end();
  const handle = createDb(TEST_URL, 20);
  await handle.db.transaction(async (tx) => {
    await ensureSystemAccounts(tx);
    await publishConfig(tx, DEV_ECONOMY_PARAMS, { activeFrom: new Date(0), createdBy: "test" });
    await postGenesis(tx, "test");
  });
  return handle;
}

export function addr(label: string) {
  return encodeTransparentAddress(createHash("sha256").update(label).digest().subarray(0, 20));
}

let n = 0;
/** A user with a linked, active pass and a slot — ready to mine. */
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
