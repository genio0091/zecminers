/**
 * Economy simulation: N Miners × D days with the dev config → Season 1 emission curve, pool
 * runway, streak spend from the community pool and weekly payout cost.
 *
 *   pnpm simulate -- --miners 3333 --days 200 --deploy 0.8 --late 0.3 --zec-usd 1500
 */
import {
  DEV_ECONOMY_PARAMS,
  POOL_ALLOCATION,
  BP,
  formatValley,
  minerTraits,
  minerWeight,
  shiftShare,
  streakBonus,
} from "../src";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

const minerCount = arg("miners", 3_333);
const days = arg("days", 200);
const deployRate = arg("deploy", 0.8); // share of Miners that work a given shift
const lateRate = arg("late", 0.3); // share of those that join part-way through the window
const zecUsd = arg("zec-usd", 1500);
const feeZecPerPayout = arg("fee-zec", 0.0003);

const P = DEV_ECONOMY_PARAMS;
type Miner = { powerBp: number; balance: bigint; streak: number };
const miners: Miner[] = Array.from({ length: minerCount }, (_, i) => ({ powerBp: minerTraits(i + 1).powerBp, balance: 0n, streak: 0 }));

let miningPool = POOL_ALLOCATION.pool_mining;
let communityPool = POOL_ALLOCATION.pool_community;
let paidOut = 0n;
let payoutCount = 0;
let mineOutDay: number | null = null;
const rows: string[] = [];

for (let day = 1; day <= days; day++) {
  const working: { m: Miner; weight: number }[] = [];
  for (const m of miners) {
    if (Math.random() >= deployRate) {
      m.streak = 0;
      continue;
    }
    const worked = Math.random() < lateRate ? Math.floor(BP * (0.2 + Math.random() * 0.8)) : BP;
    working.push({ m, weight: minerWeight(P.traitPowerEnabled ? m.powerBp : BP, worked) });
  }
  const totalWeight = working.reduce((a, w) => a + w.weight, 0);
  const pool = BigInt(P.dailyPool) > miningPool ? miningPool : BigInt(P.dailyPool);
  let minedToday = 0n;
  for (const { m, weight } of working) {
    const share = shiftShare(pool, weight, totalWeight);
    minedToday += share;
    m.balance += share;
    m.streak += 1;
    const bonus = streakBonus(P, m.streak);
    if (bonus > 0n && communityPool >= bonus) {
      communityPool -= bonus;
      m.balance += bonus;
    }
  }
  miningPool -= minedToday;
  if (miningPool === 0n && mineOutDay === null) mineOutDay = day;

  if (day % 7 === 0) {
    for (const m of miners) {
      if (m.balance >= BigInt(P.payout.minimum)) {
        const amt = m.balance > BigInt(P.payout.maxPerUser) ? BigInt(P.payout.maxPerUser) : m.balance;
        m.balance -= amt;
        paidOut += amt;
        payoutCount++;
      }
    }
  }

  if (day % 30 === 0 || day === days) {
    const avg = working.length ? minedToday / BigInt(working.length) : 0n;
    rows.push(
      [
        String(day).padStart(4),
        formatValley(miningPool).padStart(15),
        formatValley(minedToday).padStart(12),
        formatValley(avg).padStart(9),
        formatValley(communityPool).padStart(13),
        formatValley(paidOut).padStart(15),
      ].join("  "),
    );
  }
}

const feeZec = payoutCount * feeZecPerPayout;
console.log(`Hood Valley Season 1 simulation — ${minerCount} Miners × ${days} days (dev config)`);
console.log("day   mining pool left   mined/shift  avg/miner  community left  paid out total");
for (const r of rows) console.log(r);
console.log(`\nSeason 1 mined out: ${mineOutDay ? `day ${mineOutDay}` : `not within ${days} days`}`);
console.log(`payouts: ${payoutCount}, network fees ≈ ${feeZec.toFixed(4)} ZEC ≈ $${(feeZec * zecUsd).toFixed(0)} at $${zecUsd}/ZEC`);
