/**
 * Base seed (safe for production):   pnpm db:seed
 *   – system ledger accounts, economy config v1 (dev values), NU7 freeze window, and a one-time
 *     move of an old 80/10/5/5 genesis into the Hood Valley 70/15/8/5/2 pools
 *
 * Local demo data:                    pnpm db:seed -- --dev
 *   – pretends genesis is done (ledger + mock registry), a demo login holding three Valley
 *     Miners (claim code ZM-7F3A-91QD), three single-Miner logins and an open holder raffle.
 *     Refuses to run against production.
 */
import { createHash } from "node:crypto";
import { DEV_ECONOMY_PARAMS, seedCommitment } from "@hoodvalley/economy";
import { encodeTransparentAddress } from "@hoodvalley/zcash";
import { eq } from "drizzle-orm";
import {
  DbMockIndexer,
  createDb,
  ensureSystemAccounts,
  ensureUserAccount,
  getFlag,
  hashClaimCode,
  postGenesis,
  publishConfig,
  reallocateLegacyPools,
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
  return encodeTransparentAddress(createHash("sha256").update(`hoodvalley-dev:${label}`).digest().subarray(0, 20));
}

await db.transaction(async (tx) => {
  await ensureSystemAccounts(tx);

  const [cfg] = await tx.select().from(tables.economyConfig).limit(1);
  if (!cfg) {
    const v = await publishConfig(tx, DEV_ECONOMY_PARAMS, {
      activeFrom: new Date(0),
      createdBy: "seed",
      note: "Season 1 development values — shift times and streak bonus sizes are confirmed before launch",
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
  const moved = await reallocateLegacyPools(tx, "seed");
  if (moved === "done") console.log("moved the 80/10/5/5 genesis into the Hood Valley 70/15/8/5/2 pools");
  if (moved === "blocked") console.warn("the old 80/10/5/5 pools paid out more than the new split allows: plan the move to 70/15/8/5/2 by hand");
});
console.log("base seed done");

if (dev) {
  const pepper = process.env.CLAIM_CODE_PEPPER ?? "dev-only-pepper-change-me-please";
  await db.transaction(async (tx) => {
    const g = await postGenesis(tx, "seed:dev");
    console.log(g.created ? "genesis ledger transaction posted (dev)" : "genesis already posted");
    await reallocateLegacyPools(tx, "seed:dev");
    await setRegistry(tx, "token_tick", "VALLEY");
    await setRegistry(tx, "treasury_address", devAddress("treasury"));
    await setRegistry(tx, "hot_wallet_address", devAddress("hot-wallet"));
    await setRegistry(tx, "pass_collection", "VALLEYMINERS");

    const demoAddress = devAddress("demo-player");
    const [existing] = await tx.select().from(tables.passes).where(eq(tables.passes.originAddress, demoAddress));
    if (!existing) {
      // The demo login holds three Miners, like the Valley HQ preview.
      const [user] = await tx
        .insert(tables.users)
        .values({ discordId: `wallet:${demoAddress}`, discordUsername: `${demoAddress.slice(0, 6)}…${demoAddress.slice(-4)}`, walletAddress: demoAddress, walletLinkedAt: new Date() })
        .returning({ id: tables.users.id });
      await ensureUserAccount(tx, user!.id);
      const crew = [
        { passNumber: 412, originAddress: demoAddress, claimCodeHash: hashClaimCode("ZM-7F3A-91QD", pepper), note: "dev demo pass" },
        { passNumber: 1877, originAddress: devAddress("demo-crew-1"), claimCodeHash: null, note: "dev demo crew" },
        { passNumber: 3021, originAddress: devAddress("demo-crew-2"), claimCodeHash: null, note: "dev demo crew" },
      ];
      for (const c of crew) {
        const [pass] = await tx
          .insert(tables.passes)
          .values({ ...c, inscriptionId: `mockpass${String(c.passNumber).padStart(4, "0")}i0`, userId: user!.id, status: "active", claimCodeUsedAt: new Date() })
          .returning({ id: tables.passes.id });
        await tx.insert(tables.slots).values({ userId: user!.id, passId: pass!.id, state: "idle" });
      }
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
    console.log(`demo login (3 Miners) → address ${demoAddress}  claim code ZM-7F3A-91QD`);
    console.log(`single-Miner logins → ${[1, 2, 3].map((i) => `${devAddress(`player-${i}`)} / ZM-DEV${i}-TEST`).join(", ")}`);

    const [raffle] = await tx.select().from(tables.raffles).limit(1);
    if (!raffle) {
      const seed = createHash("sha256").update(`dev-raffle-seed-${Date.now()}`).digest("hex");
      await tx.insert(tables.raffles).values({
        title: "Holder raffle — dev week",
        seed,
        seedHash: seedCommitment(seed),
        // About a week ahead of the mock chain's tip (75 s blocks).
        closeBlockHeight: new DbMockIndexer(tx).height() + 8_000,
        ticketPrice: 0n,
        prizeAmount: 250_000n,
        winnerCount: 1,
      });
      console.log("dev holder raffle opened");
    }
  });
}

await close();
