/**
 * Public copy in one place, so the site, docs and FAQ can't drift apart.
 * Wording rules (blueprint §4.5): say "No liquidity pool at launch. Official trading starts after
 * the NFT mint." Never claim the token is untransferable — after the first payout it can move.
 */
export const TRADING_LINE = "No liquidity pool at launch. Official trading starts after the NFT mint.";

export const MARQUEE = [
  "NO LIQUIDITY POOL AT LAUNCH",
  "OFFICIAL TRADING STARTS AFTER THE NFT MINT",
  "WEEKLY PAYOUTS TO YOUR ZRC-20 WALLET",
  "THE PASS ONLY MINES AT THE ADDRESS IT WAS SENT TO",
];

export const PLAY_STEPS = [
  {
    n: "01",
    title: "Get a ZRC-20 wallet",
    body: "Install a ZRC-20 wallet such as Zatoshi Wallet and keep your transparent address (t1…). Your pass and every payout arrive there.",
  },
  {
    n: "02",
    title: "Claim your pass",
    body: "Passes are airdropped to winners' addresses with a one-time claim code. Enter the address and the code to link it to your account.",
  },
  {
    n: "03",
    title: "Mine",
    body: "One 12-hour session per day, per slot. Collect any time to bank what you mined. Pickaxes wear down, and can be repaired or upgraded.",
  },
  {
    n: "04",
    title: "Get paid weekly",
    body: "At the weekly cutoff your in-game balance is queued, approved, and sent from the treasury to the address your pass was airdropped to.",
  },
];

export const PAYOUT_STEPS = [
  { step: "STEP 1", title: "Cutoff", short: "Your balance is queued at the weekly cutoff.", body: "Your in-game balance is moved into the week's payout queue. Spend on upgrades before the cutoff if you want to." },
  { step: "STEP 2", title: "Checks", short: "Limits and reserve checks; a failure holds the batch.", body: "Per-user and per-batch limits, plus the reserve invariants. If anything fails the batch is held and the team is alerted." },
  { step: "STEP 3", title: "Approval", short: "A human approves before anything is signed.", body: "A human approves the batch before anything is signed. Signing happens in an isolated service, never on the website." },
  { step: "STEP 4", title: "Two transactions", short: "Transfer inscribed, then sent to your pass address.", body: "A ZRC-20 transfer is inscribed, then its UTXO is sent to your address. That second transaction is what moves the balance." },
  { step: "STEP 5", title: "Settled", short: "After finality the tokens are in your wallet.", body: "After finality the indexer credits your address, your payout history shows the txid, and the tokens are yours.", done: true },
];

export const PASS_RULES = [
  { title: "Airdropped, not bought", body: "One inscription minted straight to the winner's transparent address.", color: "bg-gold" },
  { title: "Works at one address only", body: "An hourly check compares the current owner against the airdrop address.", color: "bg-gold" },
  { title: "Move it and mining stops", body: "Transfer or sell the pass and the slot stops permanently, so there is nothing to gain by trading it.", color: "bg-ember" },
  { title: "One-time claim code", body: "The code in your airdrop message links the address to your account. One address, one account.", color: "bg-gold" },
];

/** Blueprint §4.1 / whitepaper 80/10/5/5. */
export const ALLOCATION = [
  { label: "In-game mining", pct: 80, amount: "8,000,000,000", use: "Earned by mining", color: "bg-ember" },
  { label: "Daily rewards", pct: 10, amount: "1,000,000,000", use: "Daily login rewards for pass holders", color: "bg-gold-hi" },
  { label: "Marketing", pct: 5, amount: "500,000,000", use: "Community events, campaigns and raffle prizes — admin grants only, audited", color: "bg-cream" },
  {
    label: "Liquidity — locked",
    pct: 5,
    amount: "500,000,000",
    use: "Locked. No liquidity pool at launch; any use is announced before official trading starts",
    color: "bg-sky",
  },
];

export const TOKEN_USES = [
  "Tool upgrades: a better pickaxe mines faster and lasts longer.",
  "City upgrades: push your mine from the surface camp down into the deep cave.",
  "Raffle tickets: golden tickets for the weekly provably fair draw.",
  "Repairs: worn pickaxes cost $ZGEMS to bring back.",
];

export const ROADMAP = [
  {
    phase: "PHASE 0",
    title: "Genesis",
    status: "In preparation",
    summary: "Token deployed and fully minted to the treasury; pass collection deployed; IDs published.",
    active: true,
    points: [
      "Deploy $ZGEMS as a ZRC-20 token on Zcash mainnet.",
      "Mint the full 10,000,000,000 supply to the project treasury in a single mint.",
      "Deploy the Whitelist Pass collection (ZRC-721) on Zcash.",
      "Publish the treasury address, the inscription IDs and the Proof of Reserves page.",
    ],
  },
  {
    phase: "PHASE 1",
    title: "Mining + weekly payouts",
    status: "In development",
    summary: "Passes airdropped, web mining live, daily rewards, raffles and weekly payouts.",
    active: true,
    points: [
      "Airdrop soulbound Whitelist Passes to winners and selected community members.",
      "Launch the web game: daily mining, daily rewards, tool upgrades, ores and the shop.",
      "Pay out mined $ZGEMS to players' wallets every week.",
      "Run weekly provably fair raffles.",
    ],
  },
  {
    phase: "PHASE 2",
    title: "NFT mint",
    status: "Planned",
    summary: "5,555 Miners, each a mining unit. Standard, date and price announced first.",
    active: false,
    points: ["5,555 unique Miners, each one a mining unit in the game.", "The NFT standard, mint date and price are announced before the mint."],
  },
  {
    phase: "PHASE 3",
    title: "Official trading",
    status: "Planned, after the NFT mint",
    summary: "Official trading starts after the NFT mint, announced in advance.",
    active: false,
    points: [
      "Official trading of $ZGEMS starts after the NFT mint.",
      "Where it trades, and any use of the liquidity allocation, will be announced in advance.",
    ],
  },
];

export const BUILDING = [
  { title: "Our own node and indexer", short: "Zebra + self-hosted Zord are the source of truth.", body: "A Zebra node with a self-hosted Zord indexer is the source of truth for balances and pass ownership. Your browser never talks to either directly." },
  { title: "Server-authoritative game", short: "The client sends intent; the server computes every amount.", body: "The client only sends intent — start, collect, repair. Every amount is computed on the server from a versioned config, on the server clock." },
  { title: "Double-entry ledger", short: "Immutable entries that always sum to zero.", body: "Every balance change is an immutable set of entries that sum to zero, so any number on your screen can be traced back to where it came from." },
  { title: "Cold treasury, isolated signer", short: "Treasury keys never touch a server.", body: "Treasury keys never touch a server. Weekly batches are signed by a separate service holding a small hot wallet, with no public port." },
  { title: "Provably fair raffles", short: "Seed hash + future block hash; anyone can recompute.", body: "A seed hash and a future Zcash block height are published when a raffle opens. After the draw, anyone can recompute the winner." },
  { title: "Reviewed before launch", short: "External review; payouts stop if a check fails.", body: "The payout path gets an external security review before the first batch goes out, and payouts stop automatically if a reserve check fails." },
];

export const RAFFLE_STEPS = [
  { title: "Commit", short: "Seed hash + closing block published.", body: "We publish the hash of a secret seed and the Zcash block height where the raffle closes." },
  { title: "Tickets", short: "Bought with in-game $ZGEMS.", body: "Players buy tickets with in-game $ZGEMS until just before the closing block." },
  { title: "Closing block", short: "Its hash is outside our control.", body: "The Zcash network produces the closing block. Its hash is outside our control." },
  { title: "Reveal", short: "We publish the seed and the winner.", body: "We publish the seed and compute the winner with the formula below." },
  { title: "Check", short: "Anyone can recompute it.", body: "Anyone can hash the seed, match it to the commitment and recompute the winner." },
];

export const NOT_LIST = [
  { title: "Not a smart contract", body: "Zcash doesn't run them. ZRC-20 balances come from indexers reading inscriptions." },
  { title: "Not a Zcash Shielded Asset", body: "Shielded assets aren't available on Zcash mainnet. $ZGEMS lives on the transparent layer." },
  { title: "Not officially traded yet", body: TRADING_LINE },
  { title: "Not an investment", body: "No promised value, yield or return." },
  { title: "Not affiliated with Zcash organizations", body: "ZecMiners is an independent project." },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I actually get $ZGEMS in my wallet?",
    a: "Mine it in a session, collect it into your in-game balance, and wait for the weekly batch. At the cutoff your balance is queued, approved by a human, and sent from the treasury to the address your pass was airdropped to.",
  },
  {
    q: "Do I need a special wallet?",
    a: "Yes. Use a ZRC-20 wallet such as Zatoshi Wallet and give us its transparent address (t1…). Wallets that are not inscription-aware, such as ordinary Zcash wallets, can spend the coin carrying your pass or your tokens and destroy it.",
  },
  {
    q: "What is a soulbound Whitelist Pass?",
    a: "Your pass is a ZRC-721 inscription airdropped to your address, and it only works at that address. Zcash has no smart contracts, so it can't block transfers — the game enforces the rule instead. If the pass is moved or sold, that slot stops mining permanently.",
  },
  {
    q: "Can I sell my Whitelist Pass?",
    a: "Technically nothing stops you moving the inscription, but it only mines at the address it was airdropped to. The moment it moves, that slot stops permanently, so a buyer gets an ornament rather than a mining pass.",
  },
  {
    q: "Can $ZGEMS be traded?",
    a: "No liquidity pool at launch. Official trading starts after the NFT mint. That means no liquidity and no official price, not a lock: tokens in your wallet are transferable, and ZRC-20 marketplaces let holders list them person to person.",
  },
  {
    q: "Is there a presale or token sale?",
    a: "No. There is no presale, no token sale and no liquidity pool at launch. $ZGEMS is distributed through mining and daily rewards. After a weekly payout, holders can list tokens person to person on ZRC-20 marketplaces, but there is no official price before official trading.",
  },
  {
    q: "Where does the price come from then?",
    a: "There is no official price before official trading. Whatever a holder asks on a marketplace is between them and the buyer, and demand decides whether anything trades at all.",
  },
  {
    q: "Is my in-game balance real?",
    a: "Every unpaid $ZGEMS is backed 1:1 by the treasury on-chain, and the check runs every few minutes. If a check fails, payouts stop automatically and the site goes into maintenance until it passes.",
  },
  {
    q: "How can a token exist on Zcash without smart contracts?",
    a: "$ZGEMS uses ZRC-20, a token standard built from small records called inscriptions written into ordinary transparent Zcash transactions. Indexers such as Zord read those inscriptions to calculate balances.",
  },
  {
    q: "What if the mining pool runs out?",
    a: "Mining stops and we announce it. The pools are fixed at genesis and nothing can be minted afterwards, so rates are tuned against a published runway instead.",
  },
  {
    q: "Who decides the rates?",
    a: "We do, on the server, in a versioned config. Changes take effect from the next session and the current values are always visible in the game.",
  },
  {
    q: "Are the raffles fair?",
    a: "Each draw uses a secret seed we commit to in advance plus a future Zcash block hash. We publish the seeds and results so anyone can recompute the winners.",
  },
  {
    q: "Is ZecMiners affiliated with Zcash?",
    a: "No. ZecMiners is an independent project and is not affiliated with or endorsed by any Zcash development organization. We will never ask for your seed phrase or private key.",
  },
];
