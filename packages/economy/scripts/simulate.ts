/**
 * Economy simulation (blueprint §12.1): N users × D days with a given config →
 * emission curve, mining-pool runway and weekly payout cost.
 *
 *   pnpm simulate -- --users 1000 --days 365 --collect 0.8 --zec-usd 1500
 */
import {
  DEV_ECONOMY_PARAMS,
  POOL_ALLOCATION,
  computeReward,
  dailyReward,
  formatZgems,
  repairCost,
  sessionDurationMs,
  upgradeCost,
  durabilityMax,
} from "../src";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

const users = arg("users", 1000);
const days = arg("days", 365);
const collectRate = arg("collect", 0.8); // share of users who mine on a given day
const dailyRate = arg("daily", 0.7); // share who claim the daily reward
const zecUsd = arg("zec-usd", 1500);
const feeZecPerPayout = arg("fee-zec", 0.0003); // blueprint §10.5: 0.0002–0.0004 ZEC

const P = DEV_ECONOMY_PARAMS;
type Player = { level: number; durability: number; balance: bigint; streak: number; brokenDays: number };
const players: Player[] = Array.from({ length: users }, () => ({
  level: 1,
  durability: durabilityMax(P, 1),
  balance: 0n,
  streak: 0,
  brokenDays: 0,
}));

let miningPool = POOL_ALLOCATION.pool_mining;
let dailyPool = POOL_ALLOCATION.pool_daily;
let burned = 0n;
let paidOut = 0n;
let payoutCount = 0;
const rows: string[] = [];

for (let day = 1; day <= days; day++) {
  let minedToday = 0n;
  for (const p of players) {
    if (Math.random() < dailyRate) {
      p.streak = Math.min(p.streak + 1, P.dailyStreakMax);
      const d = dailyReward(P, p.streak);
      if (dailyPool >= d) {
        dailyPool -= d;
        p.balance += d;
      }
    } else {
      p.streak = 0;
    }

    if (p.brokenDays > 0) {
      p.brokenDays--;
      continue;
    }
    if (Math.random() < collectRate && miningPool > 0n) {
      const elapsed = sessionDurationMs(P) * (0.5 + Math.random() * 0.5);
      let r = computeReward({ params: P, level: p.level, elapsedMs: elapsed });
      if (r > miningPool) r = miningPool;
      miningPool -= r;
      p.balance += r;
      minedToday += r;
      if (P.pickaxeEnabled) p.durability--;
    }

    const cost = upgradeCost(P, p.level);
    if (cost !== null && p.balance >= BigInt(cost) * 2n) {
      p.balance -= BigInt(cost);
      burned += BigInt(cost);
      p.level++;
      p.durability = durabilityMax(P, p.level);
    } else if (p.durability <= 0) {
      const rc = BigInt(repairCost(P, p.level));
      if (p.balance >= rc) {
        p.balance -= rc;
        burned += rc;
        p.durability = durabilityMax(P, p.level);
        p.brokenDays = Math.ceil(P.repairWaitHours / 24);
      }
    }
    // Occasional raffle ticket
    if (Math.random() < 0.05 && p.balance >= BigInt(P.raffleTicketPrice)) {
      p.balance -= BigInt(P.raffleTicketPrice);
      burned += BigInt(P.raffleTicketPrice);
    }
  }

  if (day % 7 === 0) {
    let batch = 0n;
    for (const p of players) {
      if (p.balance >= BigInt(P.payout.minimum)) {
        const amt = p.balance > BigInt(P.payout.maxPerUser) ? BigInt(P.payout.maxPerUser) : p.balance;
        p.balance -= amt;
        batch += amt;
        payoutCount++;
      }
    }
    paidOut += batch;
  }

  if (day % 30 === 0 || day === days) {
    const avg = minedToday / BigInt(Math.max(1, users));
    const runway = minedToday > 0n ? Number(miningPool / minedToday) : Infinity;
    rows.push(
      [
        String(day).padStart(4),
        formatZgems(miningPool).padStart(15),
        formatZgems(minedToday).padStart(11),
        formatZgems(avg).padStart(7),
        String(runway).padStart(8),
        formatZgems(paidOut).padStart(15),
        formatZgems(burned).padStart(13),
      ].join("  "),
    );
  }
}

const feeZec = payoutCount * feeZecPerPayout;
console.log(`ZecMiners economy simulation — ${users} users × ${days} days (dev config)`);
console.log("day   mining pool left   mined/day  avg/usr  runway(d)  paid out total  burned (sink)");
for (const r of rows) console.log(r);
console.log(`\npayouts: ${payoutCount}, network fees ≈ ${feeZec.toFixed(4)} ZEC ≈ $${(feeZec * zecUsd).toFixed(0)} at $${zecUsd}/ZEC`);
console.log(`daily pool left: ${formatZgems(dailyPool)}`);
