import { HOUR_MS, TOTAL_SUPPLY } from "@zecminers/economy";
import { MockIndexer } from "@zecminers/zord-client";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountBalance,
  approveBatch,
  buyRaffleTickets,
  checkBalanceCache,
  claimDaily,
  collectSession,
  createRaffle,
  createWeeklyBatch,
  drawRaffle,
  exchangeOre,
  GameError,
  importPasses,
  linkWallet,
  listSlots,
  postLedgerTx,
  repairSlot,
  runReserveChecks,
  settlePayouts,
  startSession,
  tables,
  upgradeSlot,
  userAccountCode,
  walletSignIn,
  type DbHandle,
} from "../src";
import { addr, dbAvailable, freshDb, PEPPER, playerWithPass } from "./helpers";

const available = await dbAvailable();
const T0 = new Date("2026-09-21T01:00:00Z"); // a Monday, 01:00 UTC

describe.skipIf(!available)("ledger & game services (real Postgres)", () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await freshDb();
  }, 30_000);
  afterAll(async () => {
    await h?.close();
  });

  async function linkedPlayer(label: string) {
    const p = await playerWithPass(h, label);
    const linked = await linkWallet(h.db, {
      userId: p.user.id,
      address: p.address,
      claimCode: "zm-aaaa-bbbb",
      pepper: PEPPER,
      network: "mainnet",
      maxPassesPerAccount: 1,
      now: T0,
    });
    return { ...p, slotId: linked.slotId! };
  }

  it("genesis funds the pools and backs them 1:1", async () => {
    expect(await accountBalance(h.db, "pool_mining")).toBe(8_000_000_000n);
    expect(await accountBalance(h.db, "treasury_backing")).toBe(-TOTAL_SUPPLY);
    const res = await runReserveChecks(h.db, null);
    expect(res.ok).toBe(true);
  });

  it("is idempotent and refuses unbalanced or overdrawn transactions", async () => {
    const p = await playerWithPass(h, "idem");
    await h.db.insert(tables.ledgerAccounts).values({ code: userAccountCode(p.user.id), type: "user", userId: p.user.id });
    const post = () =>
      h.db.transaction((tx) =>
        postLedgerTx(tx, {
          idempotencyKey: "grant:test-1",
          kind: "test",
          actor: "test",
          entries: [
            { account: "pool_marketing", amount: -100n },
            { account: userAccountCode(p.user.id), amount: 100n },
          ],
        }),
      );
    expect((await post()).created).toBe(true);
    expect((await post()).created).toBe(false);
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(100n);

    await expect(
      h.db.transaction((tx) =>
        postLedgerTx(tx, { idempotencyKey: "bad-1", kind: "t", actor: "t", entries: [{ account: "pool_daily", amount: -1n }, { account: "sink_burned", amount: 2n }] }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_UNBALANCED" });
    await expect(
      h.db.transaction((tx) =>
        postLedgerTx(tx, {
          idempotencyKey: "bad-2",
          kind: "t",
          actor: "t",
          entries: [
            { account: userAccountCode(p.user.id), amount: -101n },
            { account: "sink_burned", amount: 101n },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
  });

  it("rejects UPDATE and DELETE on ledger entries (append-only)", async () => {
    const cause = (p: Promise<unknown>) => p.then(() => "no error", (e: { cause?: { message?: string } }) => e.cause?.message ?? String(e));
    expect(await cause(h.db.execute(sql`update ledger_entries set amount = amount where id = (select min(id) from ledger_entries)`))).toMatch(/append-only/);
    expect(await cause(h.db.execute(sql`delete from ledger_entries`))).toMatch(/append-only/);
  });

  it("links a wallet only with the right claim code, once", async () => {
    const p = await playerWithPass(h, "link");
    const base = { userId: p.user.id, address: p.address, pepper: PEPPER, network: "mainnet" as const, maxPassesPerAccount: 1, now: T0 };
    await expect(linkWallet(h.db, { ...base, claimCode: "ZM-XXXX-YYYY" })).rejects.toMatchObject({ code: "INVALID_CLAIM" });
    await expect(linkWallet(h.db, { ...base, address: "t1notreal", claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
    const ok = await linkWallet(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" });
    expect(ok.slotId).toBeTruthy();
    const other = await playerWithPass(h, "link2");
    await expect(
      linkWallet(h.db, { ...base, userId: other.user.id, claimCode: "ZM-AAAA-BBBB" }),
    ).rejects.toMatchObject({ code: "ADDRESS_TAKEN" });
  });

  it("wallet sign-in: first time creates the account, then the code works as a password", async () => {
    const p = await playerWithPass(h, "walletlogin");
    const base = { address: p.address, pepper: PEPPER, network: "mainnet" as const, now: T0 };
    await expect(walletSignIn(h.db, { ...base, claimCode: "ZM-WRNG-CODE" })).rejects.toMatchObject({ code: "INVALID_CLAIM" });
    await expect(walletSignIn(h.db, { ...base, address: addr("no-pass-here"), claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "NO_PASS" });
    const first = await walletSignIn(h.db, { ...base, claimCode: "zm-aaaa-bbbb" });
    expect(first.created).toBe(true);
    const again = await walletSignIn(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" });
    expect(again).toMatchObject({ userId: first.userId, created: false });
    const [slot] = await listSlots(h.db, first.userId, T0);
    expect(slot?.state).toBe("idle");
    await h.db.update(tables.users).set({ status: "frozen" }).where(eq(tables.users.id, first.userId));
    await expect(walletSignIn(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "ACCOUNT_FROZEN" });
  });

  it("100 parallel collects pay exactly once", async () => {
    const p = await linkedPlayer("race");
    await startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: T0 });
    const later = new Date(T0.getTime() + 6 * HOUR_MS);
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, () => collectSession(h.db, { userId: p.user.id, slotId: p.slotId, now: later, rng: () => 9_999 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok.length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof GameError)).toBe(true);
    // 50/h × 6 h × L1 = 300
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(300n);
    const [{ n }] = (await h.db.execute<{ n: string }>(sql`select count(*) as n from ledger_transactions where kind = 'mining_collect' and ref_id in (select id::text from mining_sessions where slot_id = ${p.slotId})`)).rows as [{ n: string }];
    expect(Number(n)).toBe(1);
  }, 30_000);

  it("allows one session per slot per UTC day and enforces the state machine", async () => {
    const p = await linkedPlayer("day");
    await startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: T0 });
    await expect(startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: T0 })).rejects.toMatchObject({ code: "SESSION_ALREADY_STARTED" });
    await collectSession(h.db, { userId: p.user.id, slotId: p.slotId, now: new Date(T0.getTime() + 13 * HOUR_MS), rng: () => 0 });
    await expect(startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: new Date(T0.getTime() + 14 * HOUR_MS) })).rejects.toMatchObject({
      code: "SESSION_ALREADY_STARTED",
    });
    // full session, capped at 12 h → 600; all three ores dropped with rng 0
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(600n);
    const next = new Date(T0.getTime() + 24 * HOUR_MS);
    await startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: next });
    const [slot] = await listSlots(h.db, p.user.id, new Date(next.getTime() + HOUR_MS));
    expect(slot?.state).toBe("mining");
    expect(slot?.session?.accrued).toBe("50");
  });

  it("other users cannot touch your slot", async () => {
    const a = await linkedPlayer("owner");
    const b = await linkedPlayer("intruder");
    await expect(startSession(h.db, { userId: b.user.id, slotId: a.slotId, now: T0 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("daily reward streak, upgrade, repair and ore exchange", async () => {
    const p = await linkedPlayer("spend");
    const d1 = await claimDaily(h.db, { userId: p.user.id, now: T0 });
    expect(d1).toMatchObject({ amount: "100", streak: 1 });
    await expect(claimDaily(h.db, { userId: p.user.id, now: T0 })).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
    const d2 = await claimDaily(h.db, { userId: p.user.id, now: new Date(T0.getTime() + 24 * HOUR_MS) });
    expect(d2).toMatchObject({ amount: "110", streak: 2 });

    await expect(upgradeSlot(h.db, { userId: p.user.id, slotId: p.slotId, idempotencyKey: "u1", now: T0 })).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
    });
    // top up from marketing for the test
    await h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: "topup-spend",
        kind: "test",
        actor: "test",
        entries: [
          { account: "pool_marketing", amount: -10_000n },
          { account: userAccountCode(p.user.id), amount: 10_000n },
        ],
      }),
    );
    const up = await upgradeSlot(h.db, { userId: p.user.id, slotId: p.slotId, idempotencyKey: "u1", now: T0 });
    expect(up).toMatchObject({ level: 2, durability: 14, replayed: false });
    const replay = await upgradeSlot(h.db, { userId: p.user.id, slotId: p.slotId, idempotencyKey: "u1", now: T0 });
    expect(replay).toMatchObject({ level: 2, replayed: true });
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(10_210n - 2_000n);

    await expect(repairSlot(h.db, { userId: p.user.id, slotId: p.slotId, idempotencyKey: "r1", now: T0 })).rejects.toMatchObject({ code: "REPAIR_NOT_NEEDED" });
    await h.db.update(tables.slots).set({ durability: 0, state: "broken" }).where(eq(tables.slots.id, p.slotId));
    const rep = await repairSlot(h.db, { userId: p.user.id, slotId: p.slotId, idempotencyKey: "r1", now: T0 });
    expect(rep.cost).toBe("300");
    await expect(startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: new Date(T0.getTime() + HOUR_MS) })).rejects.toMatchObject({ code: "SLOT_BROKEN" });
    await startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: new Date(T0.getTime() + 25 * HOUR_MS) });

    await h.db.insert(tables.inventory).values({ userId: p.user.id, item: "grapestone", qty: 3 });
    const ex = await exchangeOre(h.db, { userId: p.user.id, item: "grapestone", qty: 2, idempotencyKey: "e1", now: T0 });
    expect(ex.received).toBe("150");
    await expect(exchangeOre(h.db, { userId: p.user.id, item: "grapestone", qty: 2, idempotencyKey: "e2", now: T0 })).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
    });
  });

  it("a moved pass stops mining", async () => {
    const p = await linkedPlayer("moved");
    await h.db.update(tables.passes).set({ status: "moved" }).where(eq(tables.passes.id, p.pass.id));
    await expect(startSession(h.db, { userId: p.user.id, slotId: p.slotId, now: T0 })).rejects.toMatchObject({ code: "PASS_MOVED" });
    const [slot] = await listSlots(h.db, p.user.id, T0);
    expect(slot?.state).toBe("stopped");
  });

  it("raffle: tickets are a sink, the draw is reproducible", async () => {
    const p = await linkedPlayer("raffle");
    await h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: "topup-raffle",
        kind: "test",
        actor: "test",
        entries: [
          { account: "pool_marketing", amount: -5_000n },
          { account: userAccountCode(p.user.id), amount: 5_000n },
        ],
      }),
    );
    const r = await createRaffle(h.db, { adminId: "a", title: "t", ticketPrice: 500n, prizeAmount: 1_000n, winnerCount: 1, closeBlockHeight: 1_000, tipHeight: 900, reason: "test raffle" });
    await buyRaffleTickets(h.db, { userId: p.user.id, raffleId: r.id, count: 3, idempotencyKey: "t1", tipHeight: 950, now: T0 });
    await buyRaffleTickets(h.db, { userId: p.user.id, raffleId: r.id, count: 3, idempotencyKey: "t1", tipHeight: 950, now: T0 });
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(3_500n);
    await expect(drawRaffle(h.db, { adminId: "a", raffleId: r.id, blockHash: "ab".repeat(32), tipHeight: 999, reason: "draw" })).rejects.toMatchObject({
      code: "RAFFLE_NOT_READY",
    });
    const drawn = await drawRaffle(h.db, { adminId: "a", raffleId: r.id, blockHash: "ab".repeat(32), tipHeight: 1_000, reason: "draw" });
    expect(drawn.winners[0]?.userId).toBe(p.user.id);
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(4_500n);
  });

  it("weekly payout: cutoff → approval → settle keeps every invariant", async () => {
    const p = await linkedPlayer("payout");
    await h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: "topup-payout",
        kind: "test",
        actor: "test",
        entries: [
          { account: "pool_marketing", amount: -7_777n },
          { account: userAccountCode(p.user.id), amount: 7_777n },
        ],
      }),
    );
    // treasury on-chain equals the unpaid supply
    const indexer = new MockIndexer();
    await runReserveChecks(h.db, indexer);
    const cutoff = await createWeeklyBatch(h.db, { now: new Date("2026-09-28T00:00:00Z"), freezeWindows: [] });
    expect(cutoff.status).toBe("created");
    if (cutoff.status !== "created") return;
    expect(cutoff.held).toBe(false);
    expect(await accountBalance(h.db, userAccountCode(p.user.id))).toBe(0n);
    expect(await accountBalance(h.db, "payout_pending")).toBeGreaterThanOrEqual(7_777n);
    expect((await createWeeklyBatch(h.db, { now: new Date("2026-09-28T00:05:00Z"), freezeWindows: [] })).status).toBe("exists");

    await approveBatch(h.db, { batchId: cutoff.batchId, adminId: "admin", reason: "checks green" });
    // pretend the signer broadcast everything at height 100
    await h.db
      .update(tables.payoutItems)
      .set({ status: "sent", sendTxid: "tx", sendHeight: 100, transferInscriptionId: "ins" })
      .where(eq(tables.payoutItems.batchId, cutoff.batchId));
    const early = await settlePayouts(h.db, { indexer, tipHeight: 105, nu7ActivationHeight: null, verifyOwnership: false });
    expect(early.settled).toBe(0);
    const done = await settlePayouts(h.db, { indexer, tipHeight: 120, nu7ActivationHeight: null, verifyOwnership: false });
    expect(done.settled).toBe(cutoff.recipients);
    expect(done.completed).toBe(1);
    expect(await accountBalance(h.db, "payout_pending")).toBe(0n);
    expect(await accountBalance(h.db, "treasury_backing")).toBe(-TOTAL_SUPPLY + BigInt(cutoff.total));

    const res = await runReserveChecks(h.db, null);
    expect(res.invariants.map((i) => [i.name, i.ok])).toEqual([
      ["ledger_matches_supply", true],
      ["transactions_sum_to_zero", true],
      ["no_negative_balances", true],
    ]);
    expect((await checkBalanceCache(h.db)).ok).toBe(true);
  });

  it("imports passes with one-time codes (dry run writes nothing)", async () => {
    const lines = [{ address: addr("imp-1") }, { address: addr("imp-2") }, { address: addr("imp-1") }, { address: "t1bad" }];
    const dry = await importPasses(h.db, { adminId: "a", lines, reason: "airdrop 1", pepper: PEPPER, network: "mainnet", dryRun: true });
    expect(dry.created.length).toBe(2);
    expect(dry.rejected.length).toBe(2);
    const real = await importPasses(h.db, { adminId: "a", lines, reason: "airdrop 1", pepper: PEPPER, network: "mainnet", dryRun: false });
    expect(real.created[0]!.claimCode).toMatch(/^ZM-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const again = await importPasses(h.db, { adminId: "a", lines, reason: "airdrop 1", pepper: PEPPER, network: "mainnet", dryRun: false });
    expect(again.created.length).toBe(0);
  });
});
