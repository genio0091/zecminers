/**
 * Public copy in one place, so the website, litepaper and Valley HQ can't drift apart.
 * Wording follows the Hood Valley litepaper; anything not decided yet is marked TBA.
 */

/** Season 1's daily pool as the site prints it: 7,000,000,000 / 180 days, rounded up. */
export const DAILY_POOL_TEXT = "38,888,889";

/** The daily mining loop (litepaper §05). */
export const SHIFT_STEPS = [
  {
    n: "01",
    title: "DEPLOYMENT",
    upper: "DEPLOYMENT",
    short: "Commit your Miner to today's shift",
    body: "Commit your Miner NFT to the active daily shift during the open 12-hour mining window.",
    lead: "Deployment.",
  },
  {
    n: "02",
    title: "ACTIVE EXTRACTION",
    upper: "ACTIVE EXTRACTION",
    short: "It digs for the whole window",
    body: "The Miner extracts resources continuously throughout the active window based on shift duration and trait mechanics.",
    lead: "Active Extraction.",
  },
  {
    n: "03",
    title: "CLAIMING",
    upper: "CLAIMING",
    short: "Take your share of the day's pool",
    body: "At the conclusion of the shift, return to claim your share of the daily $VALLEY emission pool.",
    lead: "Claiming.",
  },
  {
    n: "04",
    title: "MAINTENANCE & PREP",
    upper: "MAINTENANCE & PREPARATION",
    short: "Gear up to keep your streak",
    body: "Gear up your Miner for the following day's shift to maintain unbroken streak bonuses and resource efficiency.",
    lead: "Maintenance & Preparation.",
  },
];

export const BENEFITS = [
  {
    title: "DAILY MINING RIGHTS",
    body: "Exclusive eligibility to stake or commit your NFT into the daily active mining shifts.",
    icon: "pick",
  },
  {
    title: "HOLDER RAFFLES & AIRDROPS",
    body: "Access to an 8% ecosystem allocation, 800,000,000 $VALLEY, set aside for daily holder rewards, item raffles and ecosystem perks.",
    strong: "800,000,000 $VALLEY",
    icon: "ticket",
  },
  {
    title: "SEASONAL CONTINUITY & WHITELIST PRIORITY",
    body: "Season 1 holders get guaranteed early access and preferential placement for Season 2 expansions, new mints and future token distributions.",
    icon: "chevrons",
  },
  {
    title: "SECONDARY LIQUIDITY FLOW",
    body: "A sustained game economy backed by dedicated liquidity allocations from both the tokenomics and the presale proceeds.",
    icon: "drop",
  },
] as const;

/** $VALLEY tokenomics (litepaper §07): 70/15/8/5/2 of a fixed 10B supply. */
export const ALLOCATION = [
  {
    code: "pool_mining",
    name: "In-Game Mining",
    share: 70,
    amount: 7_000_000_000,
    color: "#C98500",
    purpose: "Distributed daily over the 6-month Season 1 gameplay window, at ~38.88M $VALLEY per day.",
    litepaper: "Distributed daily over the 6-month Season 1 gameplay window (~38.88M/day).",
  },
  {
    code: "pool_liquidity",
    name: "Protocol Liquidity",
    share: 15,
    amount: 1_500_000_000,
    color: "#3987E5",
    purpose: "Reserved for decentralized exchange pairing, pool depth and market stability.",
    litepaper: "Reserved for decentralized exchange pairing, pool depth, and market stability.",
  },
  {
    code: "pool_community",
    name: "Community Raffles & Holder Benefits",
    share: 8,
    amount: 800_000_000,
    color: "#D95926",
    purpose: "Dedicated to regular holder lotteries, streak incentives and ecosystem perks.",
    litepaper: "Dedicated to regular holder lotteries, streak incentives, and ecosystem perks.",
  },
  {
    code: "pool_presale_lp",
    name: "Presale LP Backing",
    share: 5,
    amount: 500_000_000,
    color: "#199E70",
    purpose: "Paired with presale-raised funds to seed the initial DEX liquidity.",
    litepaper: "Token allocation paired with presale-raised funds to seed initial DEX liquidity.",
  },
  {
    code: "pool_team",
    name: "Core Team",
    share: 2,
    amount: 200_000_000,
    color: "#9085E9",
    purpose: "Allocated for long-term project development, architecture and maintenance.",
    litepaper: "Allocated for long-term project development, architecture, and maintenance.",
  },
] as const;

export const PENDING = [
  "Official contract addresses and audit reports",
  "Whitelist and public mint dates, and pricing tiers",
  "Exact snapshot times for daily shifts and raffle draws",
];
