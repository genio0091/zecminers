/**
 * Create team/test logins (t1 address + claim code) and write them to a CSV.
 *
 *   DATABASE_URL=… CLAIM_CODE_PEPPER=… pnpm --filter @zecminers/db team-logins -- --count 100 --out ~/team-logins.csv
 *
 * CLAIM_CODE_PEPPER must be the same value the website uses, or the codes won't work there.
 * Test passes can sign in and play but are never paid out. Keep the CSV private.
 */
import { writeFileSync } from "node:fs";
import { createDb, generateTestPasses } from "../src";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const count = Number(arg("count") ?? 100);
const out = arg("out") ?? "team-logins.csv";
const label = arg("label") ?? "team test login";
const pepper = process.env.CLAIM_CODE_PEPPER;
if (!pepper || pepper.length < 16) {
  console.error("CLAIM_CODE_PEPPER (the website's value) is required");
  process.exit(1);
}

const { db, close } = createDb(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL, 2);
const logins = await generateTestPasses(db, {
  adminId: "script:team-logins",
  count,
  label,
  reason: `team logins via script (${count})`,
  pepper,
  network: process.env.ZCASH_NETWORK === "testnet" ? "testnet" : "mainnet",
});
const csv = ["no,pass_number,address,claim_code", ...logins.map((l, i) => `${i + 1},${l.passNumber},${l.address},${l.claimCode}`)].join("\n");
writeFileSync(out, csv + "\n", { mode: 0o600 });
console.log(`created ${logins.length} test logins → ${out}`);
await close();
