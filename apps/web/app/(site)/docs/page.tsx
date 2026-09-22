import type { Metadata } from "next";
import { NFT_MINERS_SUPPLY } from "@zecminers/economy";
import { LazyVideo } from "@/components/lazy-video";
import { Kicker, Panel, cx } from "@/components/ui";
import { ALLOCATION, PAYOUT_STEPS, TRADING_LINE } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Docs — how ZecMiners works, in full",
  description:
    "The token, the soulbound pass, the mining maths, the weekly payout pipeline, the safeguards and the parts still being decided.",
};

export const revalidate = 300;

const TOC = [
  ["token", "01 · The token", "Deploy, mint, allocation"],
  ["pass", "02 · The pass", "Soulbound by rule, claim codes"],
  ["mining", "03 · Mining", "Sessions, rate, durability"],
  ["spending", "04 · Spending", "Upgrades, city, raffles, ore"],
  ["payouts", "05 · Weekly payouts", "Cutoff, approval, two transactions"],
  ["miners", "06 · Miners & traits", "Phase 2 collection"],
  ["trading", "07 · Trading", "Liquidity, price, marketplaces"],
  ["safeguards", "08 · Safeguards", "Reserves, custody, chain notes"],
  ["open", "09 · Open items", "Still being decided"],
] as const;

function H2({ kicker, color = "text-gold", children }: { kicker: string; color?: string; children: React.ReactNode }) {
  return (
    <div>
      <Kicker color={color}>{kicker}</Kicker>
      <h2 className="mt-2 font-pixel text-[clamp(28px,3.6vw,42px)] [text-shadow:3px_3px_0_#000]">{children}</h2>
    </div>
  );
}

function Card({ title, children, tone = "coal" }: { title?: string; children: React.ReactNode; tone?: "coal" | "coal-2" }) {
  return (
    <Panel tone={tone} depth={4} className="p-4 text-[13.5px] text-dust">
      {title ? <strong className="block text-gold-hi">{title}</strong> : null}
      {children}
    </Panel>
  );
}

export default async function DocsPage() {
  const { params, version } = await siteConfig();
  const nft = NFT_MINERS_SUPPLY.toLocaleString("en-US");
  const mult = params.levelMultiplierBp.map((b) => (b / 10_000).toFixed(2)).join(" · ");
  return (
    <div className="mx-auto grid max-w-[1240px] gap-9 px-4 pb-24 pt-9 text-[15px] leading-[1.7] sm:px-6">
      <Panel className="p-6">
        <Kicker>Documentation · v1.0 · September 2026</Kicker>
        <h1 className="mt-3 font-pixel text-[clamp(34px,5vw,58px)] font-bold leading-[1.05] text-shadow-px">How ZecMiners works, in full</h1>
        <p className="mt-4 max-w-[720px] text-dust">
          $ZGEMS is a ZRC-20 token on Zcash mainnet. Pass holders mine it in the browser, and the balance is sent to their wallet in a weekly batch. This page is
          the long version: the token, the pass, the mining maths, the payout pipeline, the safeguards, and the parts still being decided.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5 text-[12.5px]">
          {["Network · Zcash mainnet", "Standard · ZRC-20 inscription", "Supply · 10,000,000,000", "Indexer · Zord, self-hosted"].map((t) => (
            <span key={t} className="border-3 border-black bg-ink px-3 py-1.5">
              {t}
            </span>
          ))}
        </div>
      </Panel>

      <nav aria-label="Contents" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {TOC.map(([id, title, sub]) => (
          <a key={id} href={`#${id}`} className="border-3 border-black bg-coal px-4 py-3.5 text-cream shadow-px-4 hover:bg-coal-hover">
            <span className="font-pixel text-xl">{title}</span>
            <div className="text-[12.5px] text-stone">{sub}</div>
          </a>
        ))}
      </nav>

      <Panel className="overflow-hidden bg-[linear-gradient(160deg,#2A2109_0%,#0E0B08_75%)]" tone="ink">
        <LazyVideo clip="mine-loop" label="The mine as players see it" className="h-[420px]" />
        <div className="border-t-3 border-black bg-ink px-[18px] py-3 text-[12.5px] text-stone">
          The mine as players see it. Tracks, ore nodes and a miner walking the surface camp. City upgrades push the same map deeper underground.
        </div>
      </Panel>

      <section id="token" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="01 — The token">$ZGEMS, one mint and no reprints</H2>
        <p className="m-0 max-w-[820px] text-dust">
          ZRC-20 is a reading convention on top of ordinary transparent Zcash transactions, not a network feature. Zcash nodes do not know the token exists; an
          indexer reads the inscriptions and computes balances. Our official indexer is Zord, run on our own Zebra node, and any figure we publish can be
          recomputed from the chain.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
          <Card title="DEPLOY">
            One deploy inscription registers the ticker. Only the first valid deploy for a ticker counts, so genesis happens quietly and is verified before any
            announcement.
          </Card>
          <Card title="MINT">
            The mint limit equals the maximum supply, so the whole 10,000,000,000 leaves in a single mint to the treasury. Nobody else can mint the ticker
            afterwards.
          </Card>
          <Card title="TRANSFER">
            A transfer is two transactions: the inscription, then the coin that carries it. The balance only moves when that coin reaches the recipient.
          </Card>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-[18px]">
          <Panel tone="gold" depth={5} className="flex overflow-hidden">
            <LazyVideo clip="uses" label="Uses of $ZGEMS" className="h-full" />
          </Panel>
          <Panel tone="coal-2" depth={5} className="p-5">
            <h3 className="mb-2.5 mt-0 font-pixel text-2xl">Allocation</h3>
            <div className="grid gap-2 text-[13.5px]">
              {ALLOCATION.map((a) => (
                <div key={a.label} className="flex justify-between gap-3 border-3 border-black bg-ink px-3 py-2">
                  <span>{a.label}</span>
                  <span className="text-gold-hi">
                    {a.pct}% · {a.amount}
                  </span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-3 text-[12.5px] text-stone">
              Inside the game these are ledger accounts with fixed ceilings, funded by one genesis transaction. There is no presale and nothing is set aside for sale.
              Live balances are on the proof of reserves page.
            </p>
          </Panel>
        </div>
      </section>

      <section id="pass" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="02 — The pass">Soulbound by rule, not by contract</H2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-start gap-[18px]">
          <div className="grid gap-3.5">
            <p className="m-0 text-dust">
              The Whitelist Pass is a ZRC-721 inscription minted straight to the winner&apos;s transparent address. Zcash has no smart contracts, so there is no
              on-chain way to freeze it in place. Instead the rule lives in the game, and it is simple: the pass only mines at the address it was airdropped to.
            </p>
            <Panel depth={5} className="p-[18px]">
              <div className="grid gap-2.5 text-[13.5px]">
                {[
                  ["Ownership check", "Hourly, against the indexer", ""],
                  ["If the pass moves", "Slot stops permanently", "text-ember"],
                  ["Payout destination", "Always the origin address", ""],
                  ["Account linking", "One-time claim code", ""],
                ].map(([k, v, c], i, arr) => (
                  <div key={k} className={cx("flex justify-between gap-3", i < arr.length - 1 && "border-b-3 border-ink pb-2")}>
                    <span className="text-khaki">{k}</span>
                    <span className={c}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <p className="m-0 text-[13.5px] text-dust">
              The claim code arrives with your airdrop and links one address to one account, so nobody can take over your slot by typing in your address. Because
              payouts always go to the origin address, linking somebody else&apos;s address gains nothing.
            </p>
          </div>
          <Panel tone="gold" className="overflow-hidden">
            <LazyVideo clip="zandy-pass" label="Zandy, the starter miner" className="aspect-square" />
            <div className="border-t-3 border-black bg-ink px-4 py-3 text-[12.5px] text-stone">Zandy, the starter miner every pass comes with. One pass, one slot.</div>
          </Panel>
        </div>
      </section>

      <section id="mining" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="03 — Mining">One session a day, {params.sessionHours} hours long</H2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-start gap-[18px]">
          <Panel tone="gold" className="flex flex-col overflow-hidden">
            <LazyVideo clip="rate-explainer" label="Rate example clip" className="aspect-video" />
            <div className="border-t-3 border-black bg-ink px-4 py-3 text-[12.5px] text-stone">
              The rate shown in this clip is an example. Live values come from the server config and are visible in the game.
            </div>
          </Panel>
          <div className="grid gap-3.5">
            <p className="m-0 text-dust">
              A slot runs one session per UTC day. Start it, come back within {params.sessionHours} hours, and collect. Collecting early pays what has accrued and
              ends that day&apos;s session. Reward is the base rate multiplied by the hours mined (capped at {params.sessionHours}), multiplied by your level.
            </p>
            <Panel tone="ink" depth={4} className="overflow-x-auto p-4 font-mono text-[13px] text-gold-hi">
              reward = ⌊ base_rate × min(hours, {params.sessionHours}) × level_multiplier × boost ⌋
            </Panel>
            <Panel tone="coal-2" depth={5} className="p-[18px] text-[13.5px]">
              <div className="mb-2.5 font-pixel text-[22px]">Development values · config v{version}</div>
              <div className="grid gap-2">
                {[
                  ["Session length", `${params.sessionHours} hours`],
                  ["Base rate, level 1", `${params.baseRatePerHour} $ZGEMS / hour`],
                  ["Level multipliers", mult],
                  ["Durability by level", `${params.durabilityMax.join(" · ")} sessions`],
                  ["Upgrade cost", `${params.upgradeCost.map((c) => c.toLocaleString("en-US")).join(" · ")} $ZGEMS`],
                  ["Repair cost", `${params.repairCostPerLevel} × level, then a ${params.repairWaitHours} hour wait`],
                  ["Daily login", `${params.dailyBase} base, +${params.dailyStreakBonusBp / 100}% per streak day, ${params.dailyStreakMax} max`],
                  ["Raffle ticket", `${params.raffleTicketPrice} $ZGEMS`],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-3">
                    <span className="text-khaki">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <p className="m-0 mt-3 text-[12.5px] text-stone">
                These are development values in a versioned config, not final economics. A published version is never overwritten, and a change applies from the
                next session.
              </p>
            </Panel>
            <Card>
              <strong className="mb-1.5 block font-pixel text-[19px] text-cream">Nothing is computed in your browser</strong>
              The client sends intent only: start, collect, upgrade, repair. Amounts, timers and ore drops are decided on the server, on the server clock, and
              every change is written to the ledger with an idempotency key so a double click cannot pay twice.
            </Card>
          </div>
        </div>
      </section>

      <section id="spending" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="04 — Spending">What $ZGEMS is for</H2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
          {[
            ["Tool upgrades", "Raise your level for a higher rate and more durability. An upgrade also restores a worn pickaxe."],
            ["City upgrades", "Move your mine from the surface camp down into the deep cave, changing the scene you mine in."],
            ["Raffle tickets", "Golden tickets for the weekly draw. A seed hash and a future block height are published when the raffle opens."],
            ["Repairs", "Every session costs one point of durability. At zero the slot is broken until you pay for a repair."],
          ].map(([t, b]) => (
            <Panel key={t} depth={4} className="p-4">
              <div className="font-pixel text-[21px]">{t}</div>
              <p className="m-0 mt-1.5 text-[13.5px] text-dust">{b}</p>
            </Panel>
          ))}
        </div>
        <Card tone="coal-2">
          <strong className="mb-1.5 block font-pixel text-[19px] text-cream">Ore is inventory, not a token</strong>
          Goldstone, Grapestone and Mint Stone drop while mining and live in your game inventory. They are exchangeable in the shop at a rate set in the config. Ore
          is never inscribed on-chain and is never paid out.
        </Card>
      </section>

      <section id="payouts" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="05 — Weekly payouts">From in-game balance to your wallet</H2>
        <p className="m-0 max-w-[820px] text-dust">
          Mined $ZGEMS is credited to an in-game balance backed 1:1 by the treasury. Once a week that balance is queued, checked, approved and sent on-chain. This
          is the only route by which tokens leave the treasury to players.
        </p>
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {PAYOUT_STEPS.map((s, i) => (
            <Panel as="li" key={s.step} tone={s.done ? "coal-2" : "coal"} depth={4} className="flex gap-3.5 px-4 py-3.5">
              <span className={cx("flex-none font-pixel text-[22px]", s.done ? "text-moss" : "text-gold")}>{i + 1}</span>
              <div>
                <strong>{s.title}.</strong> {s.body}
              </div>
            </Panel>
          ))}
        </ol>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          <Card title="Cold treasury">The main treasury stays offline. It only ever sends a tranche to the hot wallet, so a compromised server can lose at most that tranche.</Card>
          <Card title="No address changes">Payouts always go to the pass origin address. There is no change-address feature to abuse.</Card>
          <Card title="Coin selection is checked">Every coin is checked against the indexer before it is spent, and fee coins are kept apart from token-carrying coins.</Card>
          <Card title="Fees follow ZIP 317">Each payout is two transactions with fees computed from their byte size. The project pays them.</Card>
        </div>
      </section>

      <section id="miners" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="06 — Miners & traits">Phase 2: every miner is a mining unit</H2>
        <p className="m-0 max-w-[820px] text-dust">
          The Miners collection, {nft} in total, arrives after mining is live. Traits are drawn from helmets, tools, gems, ores, characters and backgrounds, and they
          change how a miner performs, not only how it looks. The standard and mint mechanics are decided closer to the date.
        </p>
        <Panel tone="gold" className="flex overflow-hidden">
          <LazyVideo clip="traits" label="Trait list" />
        </Panel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[18px]">
          <Panel tone="dirt" depth={5} className="overflow-hidden">
            <LazyVideo clip="miner-cave" label="Deep cave background, gem in hand" className="aspect-square" />
            <div className="border-t-3 border-black bg-ink px-3.5 py-2.5 text-[12.5px] text-stone">Deep cave background, gem in hand</div>
          </Panel>
          <Panel tone="amber" depth={5} className="overflow-hidden">
            <LazyVideo clip="miner-sun" label="Surface camp background, hat and pack" className="aspect-square" />
            <div className="border-t-3 border-black bg-ink px-3.5 py-2.5 text-[12.5px] text-stone">Surface camp background, hat and pack</div>
          </Panel>
          <Card tone="coal-2">
            <strong className="mb-1.5 block font-pixel text-xl text-cream">Trait groups</strong>
            Helmets, tools, gems, ores, character and background. Gems and ores also appear as mining drops, so the collection and the game share one art set.
          </Card>
        </div>
      </section>

      <section id="trading" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="07 — Trading" color="text-ember">
          No liquidity pool at launch
        </H2>
        <Panel tone="coal-2" className="grid max-w-[880px] gap-3.5 p-6">
          <p className="m-0 font-pixel text-[clamp(21px,2.4vw,28px)] leading-[1.3]">{TRADING_LINE}</p>
          <p className="m-0 text-sm text-dust">
            That means no liquidity and no official price. It does not mean the token is locked. ZRC-20 has no lock feature: once a weekly payout lands, the tokens
            at your address are transferable, and ZRC-20 marketplaces let holders list them person to person at whatever price they ask.
          </p>
          <p className="m-0 text-sm text-dust">
            Treat it like a game item with no shop price. No pool will buy it from you, players can still sell to each other, and whether anything trades depends
            entirely on demand. Nothing in these docs is a promise of value.
          </p>
          <p className="m-0 text-[13px] text-stone">The liquidity allocation stays locked until official trading opens after the NFT mint, and that step is announced in advance.</p>
        </Panel>
      </section>

      <section id="safeguards" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="08 — Safeguards" color="text-moss">
          What keeps the numbers honest
        </H2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-3.5">
          <Card title="Reserve checks">
            Ledger totals against supply minus settled payouts, every transaction summing to zero, no negative balances, and the on-chain treasury matching the
            unpaid balance. A failure triggers maintenance and stops payouts.
          </Card>
          <Card title="Double-entry ledger">Entries are immutable and always sum to zero. Balances are a cache of the entries, so any number can be traced to its source.</Card>
          <Card title="Fixed pools">Pool ceilings are set once at genesis. If the mining pool empties, mining stops and we announce it. Nothing is ever minted afterwards.</Card>
          <Card title="Admin actions are logged">Grants, pass deactivations, config versions and batch approvals all need a reason and are written to an audit log.</Card>
          <Card title="Chain notes">
            Transactions are built as v5 and finality is measured in time, not blocks, targeting about fifteen minutes. Payouts pause around the next network
            upgrade (NU7) until the indexer is proven in sync.
          </Card>
          <Card title="Wallet safety">
            Use a ZRC-20 wallet such as Zatoshi Wallet. Wallets that pick coins blindly can spend the coin carrying your pass or tokens and destroy it permanently.
          </Card>
        </div>
      </section>

      <section id="open" className="grid scroll-mt-20 gap-[18px]">
        <H2 kicker="09 — Open items" color="text-khaki">
          Still being decided
        </H2>
        <p className="m-0 max-w-[820px] text-dust">Publishing these openly is deliberate. Each is confirmed here before launch rather than quietly assumed.</p>
        <div className="grid gap-2.5 text-[13.5px]">
          {[
            "Exact number of Whitelist Passes, and the maximum per account.",
            "Final economy values: rates, upgrade costs, durability and ore exchange rates.",
            "Minimum payout amount, and whether small balances roll into the next week.",
            "Whether spent $ZGEMS is burned or returns to the mining pool. Burning is the current recommendation.",
            "Depositing paid-out tokens back into the game. Not planned for launch.",
            "Where raffle prizes come from: the marketing pool or ticket sales.",
            "NFT standard and mint mechanics for the Phase 2 Miners collection.",
          ].map((t) => (
            <Panel key={t} depth={4} className="flex flex-wrap gap-3.5 px-4 py-3">
              <span className="flex-none text-gold">OPEN</span>
              <span>{t}</span>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
