import { BP, POOL_ALLOCATION, TOTAL_SUPPLY, minerTraits, minerWeight, shiftShare } from "@hoodvalley/economy";
import { MockIndexer } from "@hoodvalley/zord-client";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountBalance,
  approveBatch,
  buyRaffleTickets,
  checkBalanceCache,
  claimMiners,
  connectX,
  createRaffle,
  createWeeklyBatch,
  deployMiners,
  drawRaffle,
  enterHolderRaffle,
  GameError,
  gearUpMiners,
  getShift,
  importPasses,
  isMiningHalted,
  linkWallet,
  markWaitlistTask,
  postLedgerTx,
  publishConfig,
  reallocateLegacyPools,
  runReserveChecks,
  setFlag,
  setWaitlistConsent,
  setWaitlistWallet,
  settlePayouts,
  startWithHandle,
  unlockWaitlistEntry,
  waitlistStats,
  tables,
  userAccountCode,
  walletSignIn,
  generateTestPasses,
  deactivateTestPasses,
  type DbHandle,
} from "../src";
import { addr, dbAvailable, freshDb, PEPPER, playerWithPass, TEST_PARAMS } from "./helpers";

const available = await dbAvailable();
/** Shift day k after Monday 21 Sep 2026, at hh:mm UTC. The window is 00:00–12:00 UTC. */
const at = (k: number, hh: number, mm = 0) => new Date(Date.UTC(2026, 8, 21 + k, hh, mm));
const POOL = BigInt(TEST_PARAMS.dailyPool);

describe.skipIf(!available)("ledger & shift services (real Postgres)", () => {
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
      now: at(0, 0),
    });
    return { ...p, slotId: linked.slotId!, power: minerTraits(p.pass.passNumber).powerBp };
  }
  const balance = (userId: string) => accountBalance(h.db, userAccountCode(userId));
  const topUp = (key: string, userId: string, amount: bigint) =>
    h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: key,
        kind: "test",
        actor: "test",
        entries: [
          { account: "pool_community", amount: -amount },
          { account: userAccountCode(userId), amount },
        ],
      }),
    );

  it("genesis funds the 70/15/8/5/2 pools and backs them 1:1", async () => {
    for (const [code, amount] of Object.entries(POOL_ALLOCATION)) expect(await accountBalance(h.db, code)).toBe(amount);
    expect(await accountBalance(h.db, "pool_mining")).toBe(7_000_000_000n);
    expect(await accountBalance(h.db, "treasury_backing")).toBe(-TOTAL_SUPPLY);
    const res = await runReserveChecks(h.db, null);
    expect(res.ok).toBe(true);
    await h.db.transaction(async (tx) => expect(await reallocateLegacyPools(tx, "test")).toBe("not_needed"));
  });

  it("is idempotent and refuses unbalanced or overdrawn transactions", async () => {
    const p = await playerWithPass(h, "idem");
    await h.db.insert(tables.ledgerAccounts).values({ code: userAccountCode(p.user.id), type: "user", userId: p.user.id });
    const post = () => topUp("grant:test-1", p.user.id, 100n);
    expect((await post()).created).toBe(true);
    expect((await post()).created).toBe(false);
    expect(await balance(p.user.id)).toBe(100n);

    await expect(
      h.db.transaction((tx) =>
        postLedgerTx(tx, { idempotencyKey: "bad-1", kind: "t", actor: "t", entries: [{ account: "pool_team", amount: -1n }, { account: "sink_burned", amount: 2n }] }),
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
    const base = { userId: p.user.id, address: p.address, pepper: PEPPER, network: "mainnet" as const, maxPassesPerAccount: 1, now: at(0, 0) };
    await expect(linkWallet(h.db, { ...base, claimCode: "ZM-XXXX-YYYY" })).rejects.toMatchObject({ code: "INVALID_CLAIM" });
    await expect(linkWallet(h.db, { ...base, address: "t1notreal", claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
    const ok = await linkWallet(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" });
    expect(ok.slotId).toBeTruthy();
    const other = await playerWithPass(h, "link2");
    await expect(linkWallet(h.db, { ...base, userId: other.user.id, claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "ADDRESS_TAKEN" });
  });

  it("wallet sign-in: first time creates the account and its Miner, then the code works as a password", async () => {
    const p = await playerWithPass(h, "walletlogin");
    const base = { address: p.address, pepper: PEPPER, network: "mainnet" as const, now: at(0, 1) };
    await expect(walletSignIn(h.db, { ...base, claimCode: "ZM-WRNG-CODE" })).rejects.toMatchObject({ code: "INVALID_CLAIM" });
    await expect(walletSignIn(h.db, { ...base, address: addr("no-pass-here"), claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "NO_PASS" });
    const first = await walletSignIn(h.db, { ...base, claimCode: "zm-aaaa-bbbb" });
    expect(first.created).toBe(true);
    const again = await walletSignIn(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" });
    expect(again).toMatchObject({ userId: first.userId, created: false });
    const view = await getShift(h.db, first.userId, at(0, 5));
    expect(view.miners).toHaveLength(1);
    expect(view.miners[0]).toMatchObject({ status: "ready", passNumber: p.pass.passNumber, kind: minerTraits(p.pass.passNumber).kind });
    expect(view.clock).toMatchObject({ day: "2026-09-21", open: true, shift: 21 });
    expect((await getShift(h.db, first.userId, at(0, 13))).miners[0]?.status).toBe("waiting");
    await h.db.update(tables.users).set({ status: "frozen" }).where(eq(tables.users.id, first.userId));
    await expect(walletSignIn(h.db, { ...base, claimCode: "ZM-AAAA-BBBB" })).rejects.toMatchObject({ code: "ACCOUNT_FROZEN" });
  });

  it("one shift: deploy → extract → claim a weighted share → gear up", async () => {
    const a = await linkedPlayer("full");
    const b = await linkedPlayer("late");
    await deployMiners(h.db, { userId: a.user.id, slotIds: [a.slotId], now: at(1, 0) });
    const late = await deployMiners(h.db, { userId: b.user.id, slotIds: [b.slotId], now: at(1, 6) });
    expect(late).toMatchObject({ deployed: 1, workedBp: 5_000, late: true });
    await expect(deployMiners(h.db, { userId: a.user.id, slotIds: [a.slotId], now: at(1, 7) })).rejects.toMatchObject({ code: "SESSION_ALREADY_STARTED" });

    const during = await getShift(h.db, a.user.id, at(1, 9));
    expect(during.miners[0]?.status).toBe("extracting");
    expect(during.shift.miners).toBe(2);
    await expect(claimMiners(h.db, { userId: a.user.id, now: at(1, 9) })).rejects.toMatchObject({ code: "NOTHING_TO_CLAIM" });

    const wA = minerWeight(a.power, BP);
    const wB = minerWeight(b.power, 5_000);
    const ca = await claimMiners(h.db, { userId: a.user.id, now: at(1, 12) });
    const cb = await claimMiners(h.db, { userId: b.user.id, now: at(1, 20) });
    expect(ca.total).toBe(shiftShare(POOL, wA, wA + wB).toString());
    expect(cb.total).toBe(shiftShare(POOL, wB, wA + wB).toString());
    expect(BigInt(ca.total) + BigInt(cb.total) <= POOL).toBe(true);
    expect(BigInt(ca.total) > BigInt(cb.total)).toBe(true);
    expect(await balance(a.user.id)).toBe(BigInt(ca.total));

    // Claimed but not geared: can't take the next shift yet.
    expect((await getShift(h.db, a.user.id, at(1, 20))).miners[0]?.status).toBe("needs_gear");
    await expect(deployMiners(h.db, { userId: a.user.id, slotIds: [a.slotId], now: at(2, 1) })).rejects.toMatchObject({ code: "GEAR_UP_FIRST" });
    const g = await gearUpMiners(h.db, { userId: a.user.id, now: at(1, 21) });
    expect(g).toMatchObject({ geared: 1, streak: 1, bonus: "500" });
    expect(await balance(a.user.id)).toBe(BigInt(ca.total) + 500n);
    await expect(gearUpMiners(h.db, { userId: a.user.id, now: at(1, 22) })).rejects.toMatchObject({ code: "NOTHING_TO_GEAR" });
    expect((await getShift(h.db, a.user.id, at(1, 22))).miners[0]?.status).toBe("geared");
    expect((await getShift(h.db, a.user.id, at(2, 1))).miners[0]?.status).toBe("ready");

    const feed = (await getShift(h.db, a.user.id, at(1, 22))).activity.map((e) => e.text);
    expect(feed[0]).toMatch(/^Geared up 1 Miner\. Streak is 1 day\. \+500 \$VALLEY streak bonus\.$/);
    expect(feed[1]).toMatch(/^Claimed [\d,]+ \$VALLEY from 1 Miner\.$/);
    expect(feed[2]).toBe("Deployed 1 Miner to shift 22.");
  });

  it("the window has to be open to deploy", async () => {
    const p = await linkedPlayer("closed");
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(3, 12) })).rejects.toMatchObject({ code: "WINDOW_CLOSED" });
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [], now: at(3, 1) })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("100 parallel claims pay exactly once", async () => {
    const p = await linkedPlayer("race");
    await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(4, 0) });
    const results = await Promise.allSettled(Array.from({ length: 100 }, () => claimMiners(h.db, { userId: p.user.id, now: at(4, 13) })));
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof GameError)).toBe(true);
    // Alone on the shift: the whole day's pool.
    expect(await balance(p.user.id)).toBe(POOL);
    const [{ n }] = (await h.db.execute<{ n: string }>(sql`select count(*) as n from ledger_transactions where kind = 'shift_claim' and ref_id in (select id::text from mining_sessions where slot_id = ${p.slotId})`)).rows as [{ n: string }];
    expect(Number(n)).toBe(1);
  }, 30_000);

  it("a late claim still lets the Miner join today's shift once geared", async () => {
    const p = await linkedPlayer("lateclaim");
    await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(5, 0) });
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(6, 2) })).rejects.toMatchObject({ code: "CLAIM_FIRST" });
    await claimMiners(h.db, { userId: p.user.id, now: at(6, 2) });
    await gearUpMiners(h.db, { userId: p.user.id, now: at(6, 2) });
    const d = await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(6, 3) });
    expect(d.workedBp).toBe(7_500);
  });

  it("the streak grows on consecutive days and starts over after a gap", async () => {
    const p = await linkedPlayer("streak");
    const day = async (k: number) => {
      await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(k, 0) });
      await claimMiners(h.db, { userId: p.user.id, now: at(k, 12) });
      return gearUpMiners(h.db, { userId: p.user.id, now: at(k, 13) });
    };
    expect(await day(7)).toMatchObject({ streak: 1, bonus: "500" });
    expect(await day(8)).toMatchObject({ streak: 2, bonus: "550" });
    expect((await getShift(h.db, p.user.id, at(9, 5))).streak).toMatchObject({ days: 2, gearedToday: false, nextBonus: "600" });
    expect(await day(10)).toMatchObject({ streak: 1, bonus: "500" });
  });

  it("other players cannot touch your Miner", async () => {
    const a = await linkedPlayer("owner");
    const b = await linkedPlayer("intruder");
    await expect(deployMiners(h.db, { userId: b.user.id, slotIds: [a.slotId], now: at(11, 1) })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a moved pass stops its Miner", async () => {
    const p = await linkedPlayer("moved");
    await h.db.update(tables.passes).set({ status: "moved" }).where(eq(tables.passes.id, p.pass.id));
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(11, 1) })).rejects.toMatchObject({ code: "PASS_MOVED" });
    expect((await getShift(h.db, p.user.id, at(11, 1))).miners[0]?.status).toBe("stopped");
  });

  it("holder raffle: one free entry per Miner; paid raffles stay a sink", async () => {
    const p = await linkedPlayer("raffle");
    const holder = await createRaffle(h.db, { adminId: "a", title: "holders", ticketPrice: 0n, prizeAmount: 1_000n, winnerCount: 1, closeBlockHeight: 1_000, tipHeight: 900, reason: "test raffle" });
    const e1 = await enterHolderRaffle(h.db, { userId: p.user.id, raffleId: holder.id, tipHeight: 950, now: at(12, 1) });
    expect(e1).toMatchObject({ replayed: false, count: 1 });
    expect(await enterHolderRaffle(h.db, { userId: p.user.id, raffleId: holder.id, tipHeight: 950, now: at(12, 1) })).toMatchObject({ replayed: true, count: 1 });
    await expect(buyRaffleTickets(h.db, { userId: p.user.id, raffleId: holder.id, count: 1, idempotencyKey: "x1", tipHeight: 950, now: at(12, 1) })).rejects.toMatchObject({
      code: "VALIDATION",
    });
    const view = await getShift(h.db, p.user.id, at(12, 2));
    expect(view.raffle).toMatchObject({ openId: holder.id, holder: true, entries: 1, entered: 1 });
    expect(view.activity[0]?.text).toBe(`Entered raffle #${holder.id} with 1 entry.`);
    const drawn = await drawRaffle(h.db, { adminId: "a", raffleId: holder.id, blockHash: "cd".repeat(32), tipHeight: 1_000, reason: "draw" });
    expect(drawn.winners[0]?.userId).toBe(p.user.id);
    expect(await balance(p.user.id)).toBe(1_000n);

    await topUp("topup-raffle", p.user.id, 5_000n);
    const paid = await createRaffle(h.db, { adminId: "a", title: "paid", ticketPrice: 500n, prizeAmount: 1_000n, winnerCount: 1, closeBlockHeight: 2_000, tipHeight: 1_500, reason: "test raffle" });
    await buyRaffleTickets(h.db, { userId: p.user.id, raffleId: paid.id, count: 3, idempotencyKey: "t1", tipHeight: 1_550, now: at(12, 3) });
    await buyRaffleTickets(h.db, { userId: p.user.id, raffleId: paid.id, count: 3, idempotencyKey: "t1", tipHeight: 1_550, now: at(12, 3) });
    expect(await balance(p.user.id)).toBe(6_000n - 1_500n);
    await expect(drawRaffle(h.db, { adminId: "a", raffleId: paid.id, blockHash: "ab".repeat(32), tipHeight: 1_999, reason: "draw" })).rejects.toMatchObject({
      code: "RAFFLE_NOT_READY",
    });
  });

  it("weekly payout: cutoff → approval → settle keeps every invariant", async () => {
    const p = await linkedPlayer("payout");
    await topUp("topup-payout", p.user.id, 7_777n);
    const indexer = new MockIndexer();
    await runReserveChecks(h.db, indexer);
    const cutoff = await createWeeklyBatch(h.db, { now: new Date("2026-10-05T00:00:00Z"), freezeWindows: [] });
    expect(cutoff.status).toBe("created");
    if (cutoff.status !== "created") return;
    expect(cutoff.held).toBe(false);
    expect(await balance(p.user.id)).toBe(0n);
    expect(await accountBalance(h.db, "payout_pending")).toBeGreaterThanOrEqual(7_777n);
    expect((await createWeeklyBatch(h.db, { now: new Date("2026-10-05T00:05:00Z"), freezeWindows: [] })).status).toBe("exists");

    await approveBatch(h.db, { batchId: cutoff.batchId, adminId: "admin", reason: "checks green" });
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

  it("test logins sign in and play but are never paid out", async () => {
    const logins = await generateTestPasses(h.db, { adminId: "a", count: 3, reason: "team", pepper: PEPPER, network: "mainnet" });
    expect(logins).toHaveLength(3);
    expect(new Set(logins.map((l) => l.address)).size).toBe(3);
    const t = logins[0]!;
    const me = await walletSignIn(h.db, { address: t.address, claimCode: t.claimCode, pepper: PEPPER, network: "mainnet", now: at(14, 1) });
    const view = await getShift(h.db, me.userId, at(14, 1));
    await deployMiners(h.db, { userId: me.userId, slotIds: [view.miners[0]!.slotId], now: at(14, 1) });
    await claimMiners(h.db, { userId: me.userId, now: at(14, 12) });
    const earned = await balance(me.userId);
    expect(earned > 0n).toBe(true);
    const cutoff = await createWeeklyBatch(h.db, { now: new Date("2026-10-12T00:00:00Z"), freezeWindows: [] });
    const [item] = await h.db.select().from(tables.payoutItems).where(eq(tables.payoutItems.userId, me.userId));
    expect(item).toBeUndefined();
    expect(await balance(me.userId)).toBe(earned);
    expect(cutoff.status).toBe("created");
    const off = await deactivateTestPasses(h.db, { adminId: "a", reason: "launch" });
    expect(off.deactivated).toBe(3);
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

  it("waitlist gate: tasks, a unique wallet and consent unlock the site in line order", async () => {
    const now = at(15, 9);
    const required = ["follow", "tweet:launch", "discord"];
    await expect(startWithHandle(h.db, { entryId: null, handle: "not a handle!", now })).rejects.toMatchObject({ code: "VALIDATION" });
    const a = await startWithHandle(h.db, { entryId: null, handle: "@valley_fan", now });
    expect(a.handle).toBe("valley_fan");
    const unlock = (entryId: string) => unlockWaitlistEntry(h.db, { entryId, requiredTasks: required, requireXVerified: false, now });

    await expect(unlock(a.id)).rejects.toMatchObject({ code: "VALIDATION", message: "Finish every task first." });
    for (const key of required) await markWaitlistTask(h.db, { entryId: a.id, key, now });
    await expect(unlock(a.id)).rejects.toMatchObject({ message: "Add your Robinhood Chain wallet first." });
    await expect(setWaitlistWallet(h.db, { entryId: a.id, wallet: "0x123", now })).rejects.toMatchObject({ code: "INVALID_ADDRESS" });
    const wallet = "0x000000000000000000000000000000000000DEAD";
    expect((await setWaitlistWallet(h.db, { entryId: a.id, wallet, now })).wallet).toBe(wallet.toLowerCase());
    await expect(unlock(a.id)).rejects.toMatchObject({ message: "Tick the consent box to continue." });
    await setWaitlistConsent(h.db, { entryId: a.id, agreed: true, now });
    const first = await unlock(a.id);
    expect(first.unlockedAt).not.toBeNull();
    expect((await unlock(a.id)).memberNo).toBe(first.memberNo);
    await expect(setWaitlistWallet(h.db, { entryId: a.id, wallet: "0x000000000000000000000000000000000000beef", now })).rejects.toMatchObject({ code: "CONFLICT" });

    // X login: verified identity, resumes the same entry from another device, wallets stay unique.
    const b = await connectX(h.db, { entryId: null, xId: "x-42", xUsername: "miner42", now });
    expect(b.xVerifiedAt).not.toBeNull();
    expect((await connectX(h.db, { entryId: null, xId: "x-42", xUsername: "miner42_renamed", now })).id).toBe(b.id);
    await expect(setWaitlistWallet(h.db, { entryId: b.id, wallet, now })).rejects.toMatchObject({ code: "ADDRESS_TAKEN" });
    await expect(unlockWaitlistEntry(h.db, { entryId: b.id, requiredTasks: [], requireXVerified: true, now })).rejects.toMatchObject({
      message: "Add your Robinhood Chain wallet first.",
    });
    await setWaitlistWallet(h.db, { entryId: b.id, wallet: "0x000000000000000000000000000000000000beef", now });
    await setWaitlistConsent(h.db, { entryId: b.id, agreed: true, now });
    const second = await unlockWaitlistEntry(h.db, { entryId: b.id, requiredTasks: [], requireXVerified: true, now });
    expect(second.memberNo).toBe(first.memberNo! + 1);
    expect(await waitlistStats(h.db)).toMatchObject({ entries: 2, xVerified: 1, withWallet: 2, unlocked: 2 });

    // A handle-only entry can't pass a gate that requires X sign-in.
    const c = await startWithHandle(h.db, { entryId: null, handle: "no_x_yet", now });
    await setWaitlistWallet(h.db, { entryId: c.id, wallet: "0x00000000000000000000000000000000000c0ffe", now });
    await setWaitlistConsent(h.db, { entryId: c.id, agreed: true, now });
    await expect(unlockWaitlistEntry(h.db, { entryId: c.id, requiredTasks: [], requireXVerified: true, now })).rejects.toMatchObject({
      message: "Connect your X account first.",
    });
  });

  it("Season 1 waits for its start date", async () => {
    await h.db.transaction((tx) => publishConfig(tx, { ...TEST_PARAMS, seasonStart: "2026-12-01" }, { activeFrom: at(30, 0), createdBy: "test" }));
    const p = await linkedPlayer("season");
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: at(31, 1) })).rejects.toMatchObject({ code: "SEASON_NOT_STARTED" });
    const view = await getShift(h.db, p.user.id, at(31, 1));
    expect(view.season).toMatchObject({ started: false, day: 0, start: "2026-12-01" });
    expect(view.blocker).toBe("Season 1 opens on 2026-12-01.");
    const d = await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: new Date("2026-12-01T00:00:00Z") });
    expect(d.deployed).toBe(1);
  });

  it("the season ends when the mining pool is mined out", async () => {
    const left = await accountBalance(h.db, "pool_mining");
    await h.db.transaction((tx) =>
      postLedgerTx(tx, { idempotencyKey: "drain", kind: "test", actor: "test", entries: [{ account: "pool_mining", amount: -(left - 1_000n) }, { account: "sink_burned", amount: left - 1_000n }] }),
    );
    const p = await linkedPlayer("mined-out");
    await deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: new Date("2026-12-02T00:00:00Z") });
    const c = await claimMiners(h.db, { userId: p.user.id, now: new Date("2026-12-02T12:00:00Z") });
    expect(c).toMatchObject({ total: "1000", poolExhausted: true });
    expect(await accountBalance(h.db, "pool_mining")).toBe(0n);
    expect(await isMiningHalted(h.db)).toBe(true);
    await gearUpMiners(h.db, { userId: p.user.id, now: new Date("2026-12-02T13:00:00Z") });
    await expect(deployMiners(h.db, { userId: p.user.id, slotIds: [p.slotId], now: new Date("2026-12-03T01:00:00Z") })).rejects.toMatchObject({
      code: "POOL_EXHAUSTED",
    });
    await setFlag(h.db, "mining_halted", { on: false }, "test");
  });
});

describe.skipIf(!available)("moving an old 80/10/5/5 genesis into the Hood Valley split", () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await freshDb({ genesis: false });
  }, 30_000);
  afterAll(async () => {
    await h?.close();
  });

  it("reallocates once, carries over what the old pools paid, and keeps the supply", async () => {
    await h.db.insert(tables.ledgerAccounts).values([
      { code: "pool_daily", type: "pool_daily" },
      { code: "pool_marketing", type: "pool_marketing" },
    ]);
    const legacy = { pool_mining: 8_000_000_000n, pool_daily: 1_000_000_000n, pool_marketing: 500_000_000n, pool_liquidity: 500_000_000n };
    await h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: "genesis",
        kind: "genesis",
        actor: "old",
        entries: [...Object.entries(legacy).map(([account, amount]) => ({ account, amount })), { account: "treasury_backing", amount: -TOTAL_SUPPLY }],
      }),
    );
    // Some of the old pools were already paid out before the move.
    const [user] = await h.db.insert(tables.users).values({ discordId: "legacy-player" }).returning();
    await h.db.insert(tables.ledgerAccounts).values({ code: userAccountCode(user!.id), type: "user", userId: user!.id });
    await h.db.transaction((tx) =>
      postLedgerTx(tx, {
        idempotencyKey: "legacy-play",
        kind: "test",
        actor: "old",
        entries: [
          { account: "pool_mining", amount: -300n },
          { account: "pool_daily", amount: -100n },
          { account: "pool_marketing", amount: -5_000n },
          { account: userAccountCode(user!.id), amount: 5_400n },
        ],
      }),
    );
    expect(await h.db.transaction((tx) => reallocateLegacyPools(tx, "test"))).toBe("done");
    expect(await accountBalance(h.db, "pool_mining")).toBe(POOL_ALLOCATION.pool_mining - 300n);
    expect(await accountBalance(h.db, "pool_community")).toBe(POOL_ALLOCATION.pool_community - 5_100n);
    expect(await accountBalance(h.db, "pool_liquidity")).toBe(POOL_ALLOCATION.pool_liquidity);
    expect(await accountBalance(h.db, "pool_presale_lp")).toBe(POOL_ALLOCATION.pool_presale_lp);
    expect(await accountBalance(h.db, "pool_team")).toBe(POOL_ALLOCATION.pool_team);
    expect(await accountBalance(h.db, userAccountCode(user!.id))).toBe(5_400n);
    expect(await accountBalance(h.db, "pool_daily")).toBe(0n);
    expect(await accountBalance(h.db, "pool_marketing")).toBe(0n);
    expect(await h.db.transaction((tx) => reallocateLegacyPools(tx, "test"))).toBe("not_needed");
    expect((await runReserveChecks(h.db, null)).ok).toBe(true);
  });
});
