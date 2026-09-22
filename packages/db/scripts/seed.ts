/**
 * Base seed (safe for production):   pnpm db:seed
 *   – system ledger accounts, economy config v1 (dev example values), NU7 freeze window
 *
 * Local demo data:                    pnpm db:seed -- --dev
 *   – pretends Phase 0 is done (genesis ledger + mock registry), a demo pass with claim code
 *     ZM-7F3A-91QD and an open raffle. Refuses to run against production.
 */
import { createHash } from "node:crypto";
import { DEV_ECONOMY_PARAMS, seedCommitment } from "@zecminers/economy";
import { encodeTransparentAddress } from "@zecminers/zcash";
import { eq } from "drizzle-orm";
import {
  createDb,
  ensureSystemAccounts,
  getFlag,
  hashClaimCode,
  postGenesis,
  publishConfig,
  setFlag,
  setRegistry,
  tables,
} from "../src";

const dev = process.argv.includes("--dev");
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (dev && (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")) {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const { db, close } = createDb(url, 2);

function devAddress(label: string) {
  return encodeTransparentAddress(createHash("sha256").update(`zecminers-dev:${label}`).digest().subarray(0, 20));
}

await db.transaction(async (tx) => {
  await ensureSystemAccounts(tx);

  const [cfg] = await tx.select().from(tables.economyConfig).limit(1);
  if (!cfg) {
    const v = await publishConfig(tx, DEV_ECONOMY_PARAMS, {
      activeFrom: new Date(0),
      createdBy: "seed",
      note: "development example values (blueprint §7.4) — not final economics",
    });
    console.log(`economy config v${v} published`);
  }

  if (!(await getFlag(tx, "maintenance"))) {
    await setFlag(tx, "maintenance", { on: false, reason: "", since: new Date().toISOString() }, "seed");
  }
  if (!(await getFlag(tx, "freeze_windows"))) {
    await setFlag(
      tx,
      "freeze_windows",
      [
        {
          from: "2026-11-03T00:00:00Z",
          to: "2026-11-07T00:00:00Z",
          reason: "NU7 activation ±48 h (target 5 Nov 2026; confirm after the 20 Oct decision)",
        },
      ],
      "seed",
    );
  }
});
console.log("base seed done");

if (dev) {
  const pepper = process.env.CLAIM_CODE_PEPPER ?? "dev-only-pepper-change-me-please";
  await db.transaction(async (tx) => {
    const g = await postGenesis(tx, "seed:dev");
    console.log(g.created ? "genesis ledger transaction posted (dev)" : "genesis already posted");
    await setRegistry(tx, "token_tick", "ZGEMS");
    await setRegistry(tx, "treasury_address", devAddress("treasury"));
    await setRegistry(tx, "hot_wallet_address", devAddress("hot-wallet"));
    await setRegistry(tx, "pass_collection", "ZMPASS");

    const demoAddress = devAddress("demo-player");
    const [existing] = await tx.select().from(tables.passes).where(eq(tables.passes.originAddress, demoAddress));
    if (!existing) {
      await tx.insert(tables.passes).values({
        passNumber: 142,
        originAddress: demoAddress,
        inscriptionId: "mockpass0142i0",
        claimCodeHash: hashClaimCode("ZM-7F3A-91QD", pepper),
        note: "dev demo pass",
      });
      for (let i = 1; i <= 3; i++) {
        await tx
          .insert(tables.passes)
          .values({
            passNumber: 142 + i,
            originAddress: devAddress(`player-${i}`),
            inscriptionId: `mockpass${String(142 + i).padStart(4, "0")}i0`,
            claimCodeHash: hashClaimCode(`ZM-DEV${i}-TEST`, pepper),
            note: "dev pass",
          })
          .onConflictDoNothing();
      }
    }
    console.log(`demo pass → address ${demoAddress}  claim code ZM-7F3A-91QD`);
    console.log(`extra dev passes → ${[1, 2, 3].map((i) => `${devAddress(`player-${i}`)} / ZM-DEV${i}-TEST`).join(", ")}`);

    const [raffle] = await tx.select().from(tables.raffles).limit(1);
    if (!raffle) {
      const seed = createHash("sha256").update(`dev-raffle-seed-${Date.now()}`).digest("hex");
      await tx.insert(tables.raffles).values({
        title: "Golden Ticket — dev week",
        seed,
        seedHash: seedCommitment(seed),
        closeBlockHeight: 3_480_000 + 8_000,
        ticketPrice: 500n,
        prizeAmount: 25_000n,
        winnerCount: 1,
      });
      console.log("dev raffle opened");
    }
  });
}

await close();
