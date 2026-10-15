import type { Metadata } from "next";
import Link from "next/link";
import { LazyVideo } from "@/components/lazy-video";
import { Logo } from "@/components/site/logo";
import { ALLOCATION, BENEFITS, PENDING, SHIFT_STEPS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Litepaper",
  description:
    "The full picture of Hood Valley: the 3,333 Valley Miners, the daily mining loop, the Season 1 emission schedule and the $VALLEY tokenomics. Anything not yet decided is marked TBA.",
};

const fmt = (v: number) => v.toLocaleString("en-US");

const FACTS = [
  ["NFT COLLECTION", "3,333 Valley Miners"],
  ["NETWORK", "Robinhood Chain"],
  ["MINT DATE", "TBA"],
  ["MINT PRICE", "TBA"],
  ["TOKEN", "$VALLEY"],
  ["TOTAL SUPPLY", "10,000,000,000 $VALLEY"],
  ["WEBSITE", "In development"],
];

const CONTENTS = [
  ["intro", "Introduction"],
  ["lore", "The lore"],
  ["collection", "The 3,333 NFT collection"],
  ["benefits", "Holder benefits & utility"],
  ["gameplay", "Core gameplay & daily mining loop"],
  ["emission", "Season 1 emission schedule"],
  ["tokenomics", "$VALLEY tokenomics"],
  ["season2", "Looking ahead: Season 2 migration"],
  ["launch", "Launch status & roadmap"],
];

/** Litepaper copy of the holder benefits: same four utilities, slightly longer wording. */
const LITEPAPER_BENEFITS: Record<string, string> = {
  "DAILY MINING RIGHTS": "Exclusive eligibility to stake or commit your NFT into daily active mining shifts.",
  "HOLDER RAFFLES & AIRDROPS": "Access to an 8% ecosystem allocation dedicated to daily holder rewards, item raffles, and ecosystem perks.",
  "SEASONAL CONTINUITY & WHITELIST PRIORITY":
    "Season 1 holders receive guaranteed early access and preferential placement for Season 2 expansions, new mints, and future token distributions.",
  "SECONDARY LIQUIDITY FLOW": "Benefit from a sustained game economy backed by dedicated liquidity allocations derived from both tokenomics and presale proceeds.",
};

const SEASON_TWO = [
  ["NEW TOKEN LAUNCH", "A new native token will be deployed to fuel the Season 2 economy."],
  ["UPGRADED GAMEPLAY", "Introduction of equipment crafting, expanded terrain claims, and multi-miner syndicate operations."],
  ["GENESIS CONTINUITY", "Original 3,333 Valley Miners remain the foundational genesis assets required to access Season 2 systems."],
];

function Heading({ n, id, children, color = "#C98500" }: { n: string; id: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b-3 border-night pb-2.5">
      <span className="font-pixel text-[56px] leading-[.9]" style={{ color }}>
        {n}
      </span>
      <h2 id={id} className="m-0 font-pixel text-[clamp(36px,3.6vw,48px)] font-normal leading-none">
        {children}
      </h2>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className="border-t-3 border-night bg-night px-3.5 py-2.5 font-mono text-[11.5px] tracking-[1px] text-cream">{children}</figcaption>;
}

function PendingList() {
  return (
    <ul className="m-0 mt-3 grid list-none gap-2.5 p-0">
      {PENDING.map((p) => (
        <li key={p} className="flex flex-wrap items-center justify-between gap-3.5 border-3 border-night bg-cream px-3.5 py-3">
          <span className="flex items-center gap-3">
            <span aria-hidden className="box-border block size-[18px] flex-none border-3 border-night" />
            {p}
          </span>
          <span className="font-mono text-[11px] font-bold tracking-[1.5px] text-ink-link">PENDING</span>
        </li>
      ))}
    </ul>
  );
}

/** The litepaper is open to everyone, also before the Claim Office: it is how visitors decide to join. */
export default function LitepaperPage() {
  const section = "grid grid-cols-[minmax(0,1fr)] gap-4";
  const body = "m-0 max-w-[760px]";
  return (
    <div className="bg-paper text-[17px] leading-[1.7] text-night [&_a]:text-ink-link [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-night">
      <header className="border-b-3 border-black bg-night text-cream">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/" aria-label="Hood Valley website" className="flex items-center gap-2.5 text-cream no-underline! hover:text-cream!">
            <Logo size={32} textClass="text-[30px]" />
            <span className="font-mono text-[11px] tracking-[2px] text-gold">LITEPAPER</span>
          </Link>
          <nav aria-label="Site" className="ml-auto flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="block border-2 border-umber px-3.5 py-2.5 font-mono text-xs tracking-[1.5px] text-cream! no-underline! hover:border-gold hover:text-gold!"
            >
              WEBSITE
            </Link>
            <Link
              href="/play"
              className="block border-2 border-black bg-gold px-3.5 py-2.5 font-mono text-xs tracking-[1.5px] text-night! no-underline! hover:bg-gold-hi"
            >
              VALLEY HQ
            </Link>
          </nav>
        </div>
      </header>

      <section aria-labelledby="doc-title" className="border-b-3 border-night bg-gold">
        <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-end gap-10 px-6 pb-12 pt-14">
          <div>
            <div className="font-mono text-xs font-bold tracking-[2px]">LITEPAPER · PRE-LAUNCH EDITION</div>
            <h1
              id="doc-title"
              className="mt-3 mb-0 font-pixel text-[clamp(72px,9vw,132px)] font-normal leading-[.84] tracking-[1px] [text-shadow:0_6px_0_rgba(26,18,8,.16)]"
            >
              HOOD VALLEY
            </h1>
            <p className="mt-3.5 mb-0 font-pixel text-[clamp(30px,3vw,42px)] leading-none text-umber-2">MINE THE FRONTIER</p>
            <p className="mt-5 mb-0 max-w-[560px] text-[17px] text-umber-3">
              The full picture of the game, the 3,333 Valley Miners, the daily mining loop, the Season 1 emission schedule and the $VALLEY tokenomics. Anything not
              yet decided is marked TBA.
            </p>
          </div>
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] border-3 border-night bg-paper shadow-[10px_10px_0_#1A1208]">
            {FACTS.map(([k, v], i) => (
              <div key={k} className={`px-4 py-3.5 ${i < FACTS.length - 1 ? "border-b-2 border-paper-line" : ""} ${i % 2 === 0 && i < FACTS.length - 1 ? "border-r-2 border-r-paper-line" : ""}`}>
                <dt className="font-mono text-[10.5px] tracking-[1.5px] text-umber">{k}</dt>
                <dd className="mt-0.5 mb-0 font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-12 px-6 pb-[88px] pt-12">
        <nav aria-label="Contents" className="min-w-0 max-w-[300px] flex-[1_1_240px] border-3 border-night bg-paper-2 px-5 py-[18px] shadow-[6px_6px_0_#1A1208] lg:sticky lg:top-6">
          <div className="font-mono text-[11px] tracking-[2px] text-umber">CONTENTS</div>
          <ol className="mt-3 mb-0 grid list-none gap-1 p-0 text-[15px] leading-[1.4]">
            {CONTENTS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2.5 py-[5px] text-night! no-underline! hover:text-ink-link!">
                  <span className="pt-0.5 font-mono text-xs text-ink-link">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="grid min-w-0 flex-[999_1_560px] grid-cols-[minmax(0,1fr)] gap-16">
          <section id="intro" aria-labelledby="h-intro" className={section}>
            <Heading n="01" id="h-intro">
              INTRODUCTION
            </Heading>
            <p className={`${body} text-[19px] leading-[1.65]`}>
              Hood Valley is an on-chain mining simulation and strategy game deployed on Robinhood Chain, powered by a collection of 3,333 utility-driven NFTs and
              the native $VALLEY token.
            </p>
            <p className={`${body} text-umber-3`}>
              Players deploy their Miners into daily resource expeditions, extract $VALLEY directly from the ecosystem&apos;s gameplay pool, and unlock
              holder-exclusive economic perks across dynamic gaming seasons.
            </p>
          </section>

          <section id="lore" aria-labelledby="h-lore" className={section}>
            <Heading n="02" id="h-lore">
              THE LORE
            </Heading>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-center gap-7">
              <blockquote className="m-0 text-[clamp(20px,1.9vw,24px)] font-medium leading-[1.55]">
                Beneath the rugged expanses of Hood Valley lies an untapped grid of high-value resource deposits. Guided by explorer Zandy, a crew of 3,333 Miners
                sets out to stake claims, dig deep, and extract wealth from the frontier.
              </blockquote>
              <figure className="m-0 border-3 border-night bg-gold shadow-[8px_8px_0_#1A1208]">
                <div className="aspect-square overflow-hidden">
                  <LazyVideo clip="zandy" label="Zandy, the base character, in pixel art" className="h-full scale-[1.9]" />
                </div>
                <Caption>ZANDY · EXPLORER OF HOOD VALLEY</Caption>
              </figure>
            </div>
          </section>

          <section id="collection" aria-labelledby="h-collection" className={section}>
            <Heading n="03" id="h-collection">
              THE 3,333 NFT COLLECTION
            </Heading>
            <p className={body}>
              The Hood Valley collection consists of 3,333 unique digital Miners operating on Robinhood Chain. Beyond digital art and collectible traits, each NFT
              serves as an active worker license required to participate in daily game loops, extract seasonal rewards, and access project benefits.
            </p>
            <figure className="mt-2 mb-0 border-3 border-night bg-[#DDA02A] shadow-[8px_8px_0_#1A1208]">
              <LazyVideo clip="traits" label="Trait sheet: helmets, tools, gems, ores, characters and backgrounds" className="aspect-video" />
              <Caption>TRAIT SHEET (IN DEVELOPMENT) · Final traits and their mining effects are confirmed before mint.</Caption>
            </figure>
          </section>

          <section id="benefits" aria-labelledby="h-benefits" className={section}>
            <Heading n="04" id="h-benefits">
              HOLDER BENEFITS &amp; UTILITY
            </Heading>
            <p className={body}>Owning a Hood Valley Miner grants direct access to all core utility layers:</p>
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-3.5">
              {BENEFITS.map((b) => (
                <div key={b.title} className="border-3 border-night bg-paper-2 px-[18px] py-4">
                  <dt className="font-pixel text-[28px] leading-none">{b.title}</dt>
                  <dd className="mt-2 mb-0 text-base text-umber-3">{LITEPAPER_BENEFITS[b.title]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="gameplay" aria-labelledby="h-gameplay" className={section}>
            <Heading n="05" id="h-gameplay">
              CORE GAMEPLAY &amp; DAILY MINING LOOP
            </Heading>
            <p className={body}>Hood Valley gameplay runs entirely on-chain through structured mining windows:</p>
            <ol className="m-0 grid list-none gap-3 p-0">
              {SHIFT_STEPS.map((s) => (
                <li key={s.n} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-4 border-3 border-night bg-paper px-[18px] py-4 shadow-[5px_5px_0_#1A1208]">
                  <span className="font-pixel text-[46px] leading-[.9] text-amber">{s.n}</span>
                  <div>
                    <strong className="text-lg">{s.lead}</strong> {s.body}
                  </div>
                </li>
              ))}
            </ol>
            <figure className="mt-2 mb-0 border-3 border-night bg-valley-lit shadow-[8px_8px_0_#1A1208]">
              <LazyVideo clip="valley-map" label="Pixel-art valley map with a miner, a mine entrance and rail tracks" className="aspect-[21/9]" />
              <Caption>VALLEY MAP (IN DEVELOPMENT) · Exact shift and snapshot times are confirmed before launch.</Caption>
            </figure>
          </section>

          <section id="emission" aria-labelledby="h-emission" className={section}>
            <Heading n="06" id="h-emission">
              SEASON 1 MINING EMISSION SCHEDULE
            </Heading>
            <p className={body}>
              Season 1 is scheduled to run for approximately 6 months (180 days). The season terminates automatically once the full 70% in-game mining allocation
              (7,000,000,000 $VALLEY) is fully mined out.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
              {[
                ["TOTAL SEASON 1 MINING POOL", "7,000,000,000 $VALLEY", "70% of total supply"],
                ["EMISSION DURATION", "180 days", "6 months"],
                ["DAILY IN-GAME MINING ALLOCATION", "~38,888,889 $VALLEY", "per day"],
              ].map(([k, v, n]) => (
                <div key={k} className="border-3 border-night bg-night px-[18px] py-4 text-cream">
                  <div className="font-mono text-[10.5px] tracking-[1.5px] text-dust">{k}</div>
                  <div className="mt-1 text-2xl font-bold leading-[1.2] text-gold">{v}</div>
                  <div className="text-[13px] text-dust">{n}</div>
                </div>
              ))}
            </div>
            <p className={body}>
              At the conclusion of Season 1, the mining phase for $VALLEY closes permanently, transitioning the ecosystem into Season 2, which will introduce expanded
              gameplay mechanics, upgraded assets, and a brand-new operational token.
            </p>
          </section>

          <section id="tokenomics" aria-labelledby="h-tokenomics" className={section}>
            <Heading n="07" id="h-tokenomics">
              $VALLEY TOKENOMICS
            </Heading>
            <p className={body}>The total supply of $VALLEY is fixed at 10,000,000,000 tokens.</p>
            <div className="border-3 border-night bg-vault p-5 text-cream shadow-[8px_8px_0_#1A1208]">
              <div aria-hidden className="mb-2 flex gap-0.5 font-mono text-[11.5px] tracking-[1px] text-dust">
                <span className="min-w-0 flex-[70_1_0px]">70% · IN-GAME MINING</span>
                <span className="min-w-0 flex-[15_1_0px]">15%</span>
                <span className="min-w-0 flex-[15_1_0px]" />
              </div>
              <div
                role="img"
                aria-label="Supply split: In-Game Mining 70%, Protocol Liquidity 15%, Community Raffles and Holder Benefits 8%, Presale LP Backing 5%, Core Team 2%"
                className="flex h-10 gap-0.5"
              >
                {ALLOCATION.map((a) => (
                  <span key={a.code} className="block min-w-1.5" style={{ flex: `${a.share} 1 0px`, background: a.color }} />
                ))}
              </div>
              <div className="mt-[18px] overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[15px]">
                  <thead>
                    <tr className="text-left font-mono text-[11px] tracking-[1.5px] text-khaki">
                      <th scope="col" className="border-b-3 border-black py-2.5 pr-2.5 font-medium">
                        ALLOCATION
                      </th>
                      <th scope="col" className="border-b-3 border-black p-2.5 text-right font-medium">
                        SHARE
                      </th>
                      <th scope="col" className="border-b-3 border-black p-2.5 text-right font-medium">
                        TOKEN AMOUNT
                      </th>
                      <th scope="col" className="border-b-3 border-black py-2.5 pl-4 font-medium">
                        PURPOSE / MECHANICS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALLOCATION.map((a) => (
                      <tr key={a.code}>
                        <th scope="row" className="border-b-2 border-rock py-3 pr-2.5 text-left font-semibold">
                          <span className="flex items-center gap-2.5">
                            <span aria-hidden className="block size-3 flex-none" style={{ background: a.color }} />
                            {a.name}
                          </span>
                        </th>
                        <td className="border-b-2 border-rock p-2.5 py-3 text-right tabular">{a.share}%</td>
                        <td className="border-b-2 border-rock p-2.5 py-3 text-right tabular">{fmt(a.amount)}</td>
                        <td className="border-b-2 border-rock py-3 pl-4 text-dust">{a.litepaper}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <th scope="row" className="pt-3 pr-2.5 text-left">
                        Total
                      </th>
                      <td className="px-2.5 pt-3 text-right tabular">100%</td>
                      <td className="px-2.5 pt-3 text-right tabular">10,000,000,000</td>
                      <td className="pl-4 pt-3 font-medium text-dust">Fixed total supply.</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

          <section id="season2" aria-labelledby="h-season2" className={section}>
            <Heading n="08" id="h-season2" color="#1F6A88">
              LOOKING AHEAD: SEASON 2 MIGRATION
            </Heading>
            <p className={body}>When the final Season 1 block is mined and the 7-billion $VALLEY supply is in circulation, the frontier expands:</p>
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-3.5">
              {SEASON_TWO.map(([t, d]) => (
                <div key={t} className="border-3 border-night bg-teal-deep px-[18px] py-4 text-cream">
                  <dt className="font-pixel text-[28px] leading-none text-sky">{t}</dt>
                  <dd className="mt-2 mb-0 text-base text-sand">{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="launch" aria-labelledby="h-launch" className={section}>
            <Heading n="09" id="h-launch">
              LAUNCH STATUS &amp; ROADMAP DETAILS
            </Heading>
            <p className={body}>The Hood Valley web platform and dApp interfaces are currently in active development for Robinhood Chain.</p>
            <div className="border-3 border-night bg-gold p-5 shadow-[8px_8px_0_#1A1208]">
              <div className="font-mono text-[11px] font-bold tracking-[2px]">CONFIRMED PRIOR TO PUBLIC RELEASE</div>
              <PendingList />
            </div>
          </section>

          <footer className="grid gap-2 border-t-3 border-night pt-5 text-[13.5px] leading-[1.6] text-umber-2">
            <p className="m-0">
              Hood Valley is an independent project built on Robinhood Chain. It is not affiliated with, endorsed by or sponsored by Robinhood Markets, Inc. Network
              fees on Robinhood Chain are paid in ETH.
            </p>
            <p className="m-0">
              This litepaper describes a game in development. It is not financial advice or a promise of value. Parameters marked TBA, and the final trait
              mechanics, are confirmed before public release.
            </p>
            <p className="m-0">
              <Link href="/">Back to the Hood Valley website</Link>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
