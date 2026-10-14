/**
 * Public copy in one place, so the website, litepaper and Valley HQ can't drift apart.
 * Wording follows the Hood Valley litepaper; anything not decided yet is marked TBA.
 */

export const MARQUEE = [
  "3,333 VALLEY MINERS",
  "ONE 12-HOUR SHIFT A DAY",
  "~38,888,889 $VALLEY MINED DAILY",
  "180-DAY SEASON 1",
  "10,000,000,000 FIXED SUPPLY",
  "BUILT ON ROBINHOOD CHAIN",
];

export const HERO_STATS = [
  { value: "3,333", label: "Valley Miners" },
  { value: "10B", label: "$VALLEY, fixed" },
  { value: "12 H", label: "Daily shift" },
  { value: "180 D", label: "Season 1" },
];

export const COLLECTION_POINTS = [
  { n: "01", title: "Daily game loops.", body: "Your license is what lets a Miner into the 12-hour shift." },
  { n: "02", title: "Seasonal rewards.", body: "Each shift pays out a share of that day's $VALLEY pool." },
  { n: "03", title: "Project benefits.", body: "Holder raffles, airdrops and Season 2 priority." },
];

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

export const SEASON_TWO = [
  { kicker: "NEW TOKEN LAUNCH", title: "A FRESH ECONOMY", body: "A new native token is deployed to fuel the Season 2 economy." },
  {
    kicker: "UPGRADED GAMEPLAY",
    title: "CRAFT · CLAIM · ORGANIZE",
    points: ["Equipment crafting", "Expanded terrain claims", "Multi-miner syndicate operations"],
  },
  {
    kicker: "GENESIS CONTINUITY",
    title: "YOUR MINER COMES WITH YOU",
    body: "The original 3,333 Valley Miners stay the foundational genesis assets required to access Season 2 systems.",
  },
];

export const ROADMAP = [
  { tag: "NOW", title: "PLATFORM BUILD", body: "Web platform and dApp interfaces in active development for Robinhood Chain.", now: true },
  { tag: "NEXT", title: "PRE-LAUNCH CONFIRMATIONS", body: "Contracts, audits, mint details and shift times are published. Checklist below." },
  { tag: "TBA", title: "THE MINT", body: "3,333 Valley Miners. Whitelist and public mint. Date TBA, price TBA." },
  { tag: "180 DAYS", title: "SEASON 1", body: "Daily shifts mine out 7,000,000,000 $VALLEY at ~38,888,889 a day." },
  { tag: "AFTER MINE-OUT", title: "SEASON 2", body: "New token, crafting, terrain claims and syndicates. Genesis Miners required.", sky: true },
];

export const PENDING = [
  "Official contract addresses and audit reports",
  "Whitelist and public mint dates, and pricing tiers",
  "Exact snapshot times for daily shifts and raffle draws",
];

export const ALLOWLIST_TASKS = [
  { key: "follow", label: "Follow Hood Valley on X" },
  { key: "discord", label: "Join the Hood Valley Discord" },
  { key: "repost", label: "Repost the launch announcement" },
] as const;

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Hood Valley?",
    a: "An on-chain mining simulation and strategy game on Robinhood Chain. It runs on a collection of 3,333 utility NFTs, the Valley Miners, and the native $VALLEY token.",
  },
  {
    q: "What do I need to play?",
    a: "A Valley Miner. Each NFT is the worker license that lets it join the daily shift. You also need a wallet on Robinhood Chain, where network fees are paid in ETH.",
  },
  {
    q: "How does a shift work?",
    a: "Commit your Miner while the 12-hour mining window is open, let it extract through the window, then claim your share of that day's $VALLEY pool when the shift ends. Gear up before the next shift to keep your streak bonuses.",
  },
  {
    q: "How much $VALLEY is mined each day?",
    a: "About 38,888,889 $VALLEY: the 7,000,000,000 Season 1 pool spread over 180 days. How much of it your Miner takes depends on shift duration and trait mechanics.",
  },
  {
    q: "What happens when Season 1 ends?",
    a: "Season 1 ends automatically once all 7,000,000,000 $VALLEY are mined out, planned at about 180 days. Mining for $VALLEY then closes permanently and Season 2 begins with a new operational token.",
  },
  {
    q: "Do Season 1 Miners carry over?",
    a: "Yes. The original 3,333 Valley Miners remain the genesis assets required to access Season 2 systems. Season 1 holders also get early access and preferential placement for Season 2 expansions, new mints and future token distributions.",
  },
  {
    q: "When is the mint, and what does it cost?",
    a: "Both are TBA. Whitelist and public mint dates and the pricing tiers are confirmed before public release.",
  },
  {
    q: "Where are the contracts and audits?",
    a: "Official contract addresses and audit reports are published before public release. Until then, treat any address claiming to be Hood Valley as unofficial.",
  },
  {
    q: "What is the 8% community allocation for?",
    a: "800,000,000 $VALLEY reserved for regular holder lotteries, streak incentives and ecosystem perks, including daily holder rewards, item raffles and airdrops.",
  },
  {
    q: "How is liquidity handled?",
    a: "15% of supply, 1,500,000,000 $VALLEY, is reserved for DEX pairing, pool depth and market stability. Another 5%, 500,000,000 $VALLEY, is paired with presale-raised funds to seed the initial DEX liquidity.",
  },
];

export const DISCLAIMER =
  "Hood Valley is an independent project built on Robinhood Chain. It is not affiliated with, endorsed by or sponsored by Robinhood Markets, Inc.";
