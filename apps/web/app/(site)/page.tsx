import Link from "next/link";
import { NFT_MINERS_SUPPLY } from "@zecminers/economy";
import { Countdown } from "@/components/site/countdown";
import { Faq } from "@/components/site/faq";
import { LiveReserves } from "@/components/site/live-reserves";
import { WaitlistForm } from "@/components/site/waitlist-form";
import { LazyVideo } from "@/components/lazy-video";
import { Bar, buttonClass, Dot, Kicker, Panel, SectionTitle, Stat, cx } from "@/components/ui";
import {
  ALLOCATION,
  BUILDING,
  FAQ,
  MARQUEE,
  NOT_LIST,
  PASS_RULES,
  PAYOUT_STEPS,
  PLAY_STEPS,
  RAFFLE_STEPS,
  ROADMAP,
  TOKEN_USES,
  TRADING_LINE,
} from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 300;

const nft = NFT_MINERS_SUPPLY.toLocaleString("en-US");

function Section({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cx("scroll-mt-20 border-b-3 border-black py-24", className)}>
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">{children}</div>
    </section>
  );
}

export default async function Home() {
  const { params, payoutDay } = await siteConfig();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* ---------- hero ---------- */}
      <section id="top" className="relative flex min-h-[86vh] items-center overflow-hidden border-b-3 border-black">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#2A2109_0%,#0E0B08_72%)]" />
        <LazyVideo clip="mine-loop" eager label="Pixel-art mine: a miner works the surface camp beside a rail track" className="absolute inset-0 h-full opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0E0B08_8%,rgba(14,11,8,.82)_48%,rgba(14,11,8,.35)_100%)]" />
        <div className="scanlines pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-[1180px] px-4 pb-20 pt-24 sm:px-6">
          <div className="max-w-[760px]">
            <div className="inline-flex items-center gap-2.5 border-3 border-black bg-coal px-3 py-1.5 text-xs uppercase tracking-[2px] text-gold-hi shadow-px-4">
              <span className="block size-[9px] animate-blink bg-moss" />
              ZRC-20 token on Zcash mainnet
            </div>
            <h1 className="mt-5 font-pixel text-[clamp(40px,7vw,86px)] font-bold leading-[1.02] tracking-[-0.5px] text-shadow-px-lg">
              Mine <span className="text-gold">$ZGEMS</span> in the browser. Paid to your wallet every week.
            </h1>
            <p className="mt-6 max-w-[620px] text-[clamp(16px,1.5vw,19px)] text-sand text-pretty">
              ZecMiners is a pixel mining game. Holders of the soulbound Whitelist Pass run 12-hour mining sessions on the site, and everything they mine is sent
              to their Zcash wallet in a weekly batch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link href="#waitlist" className={buttonClass("gold", "lg")}>
                Join the waitlist
              </Link>
              <Link href="#play" className={buttonClass("dark", "lg")}>
                How you play
              </Link>
            </div>
            <div className="mt-11 grid max-w-[680px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              <Stat label="Total supply" value="10,000,000,000" />
              <Stat label="Standard" value="ZRC-20" />
              <Stat label="Mining session" value={`${params.sessionHours} hours`} />
              <Stat label="Payouts" value="Weekly" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- marquee ---------- */}
      <div className="overflow-hidden border-b-3 border-black bg-gold py-2 text-ink" aria-label={MARQUEE.join(". ")}>
        <div className="flex w-max animate-marquee font-pixel text-[19px] tracking-[0.5px]" aria-hidden>
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-7 pr-7">
              {MARQUEE.map((m) => (
                <span key={m} className="flex gap-7">
                  <span>{m}</span>
                  <span>◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- 01 how you play ---------- */}
      <Section id="play" className="bg-[radial-gradient(120%_80%_at_10%_0%,#17110A_0%,#0E0B08_60%)]">
        <SectionTitle kicker="01 — How you play" title="Four steps, wallet first">
          Your wallet address is the account that matters. The pass is airdropped to it, mining is tied to it, and every weekly payout goes back to it.
        </SectionTitle>
        <ol className="mt-11 grid list-none grid-cols-[repeat(auto-fit,minmax(255px,1fr))] gap-5 p-0">
          {PLAY_STEPS.map((s) => (
            <Panel as="li" key={s.n} className="p-5">
              <div className="font-pixel text-[44px] leading-none text-gold">{s.n}</div>
              <h3 className="mb-2 mt-3 font-pixel text-[26px]">{s.title}</h3>
              <p className="m-0 text-sm text-dust">{s.body}</p>
            </Panel>
          ))}
        </ol>
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
          <Panel tone="gold" className="min-h-[230px] overflow-hidden">
            <LazyVideo clip="rate-explainer" label="A miner's hourly rate, shown as an example of 500 per hour" className="h-full" />
          </Panel>
          <Panel tone="coal-2" className="flex flex-col justify-center p-6">
            <h3 className="mb-2.5 mt-0 font-pixel text-[28px]">Rates are set on the server</h3>
            <p className="mb-3.5 mt-0 text-sm text-dust">
              Rewards are calculated server-side from a versioned config on the UTC clock, and the client never sends an amount. The current development rate is{" "}
              <strong className="text-gold-hi">{params.baseRatePerHour} $ZGEMS per hour</strong> at level 1, and the 500 per hour in our art is an example. Both
              can change before launch.
            </p>
            <ul className="m-0 grid gap-1.5 pl-[18px] text-sm text-dust">
              <li>One session per slot per day, reset at 00:00 UTC</li>
              <li>Daily login reward with a streak bonus, pass holders only</li>
              <li>Upgrades, repairs and raffle tickets spend $ZGEMS back into the game</li>
              <li>If the mining pool empties, mining stops. No new tokens are ever minted.</li>
            </ul>
          </Panel>
        </div>
      </Section>

      {/* ---------- 02 payouts ---------- */}
      <Section id="payouts" className="bg-ink">
        <div className="flex flex-wrap items-end justify-between gap-7">
          <SectionTitle kicker="02 — Weekly payouts" title="How weekly payouts work" />
          <Panel depth={5} className="min-w-[255px] px-[18px] py-3.5">
            <div className="text-[11px] uppercase tracking-[1.5px] text-khaki">Next cutoff · {payoutDay} 00:00 UTC</div>
            <Countdown weekday={params.payout.weekday} className="font-pixel text-[32px] tracking-[1px] text-gold-hi" />
          </Panel>
        </div>
        <p className="mt-4 max-w-[680px] text-dust">
          Mined $ZGEMS sits in your in-game balance, backed 1:1 by the treasury, until the weekly batch moves it on-chain. Every batch is a real ZRC-20 transfer
          you can check yourself.
        </p>
        <ol className="mt-11 grid list-none grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 p-0">
          {PAYOUT_STEPS.map((s, i) => (
            <Panel as="li" key={s.step} tone={s.done ? "coal-2" : "coal"} className="relative p-5">
              <div className={cx("text-[11px] tracking-[1.5px]", s.done ? "text-moss" : "text-gold")}>{s.step}</div>
              <h3 className="my-2 font-pixel text-[23px]">{s.title}</h3>
              <p className="m-0 text-[13.5px] text-dust">{s.body}</p>
              {i < PAYOUT_STEPS.length - 1 ? (
                <span aria-hidden className="absolute -right-[13px] top-1/2 z-10 hidden -translate-y-1/2 font-pixel text-xl text-gold xl:block">
                  ▸
                </span>
              ) : null}
            </Panel>
          ))}
        </ol>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {[
            ["Fees are on us", "Network fees for the weekly batch are paid by the project, not taken out of your balance."],
            ["Always your pass address", "Payouts go to the address your pass was airdropped to. There is no change-address feature."],
            ["Use a ZRC-20 wallet", "Ordinary Zcash wallets pick coins blindly and can destroy inscriptions. Keep your pass and payouts in a ZRC-20 wallet."],
          ].map(([t, b]) => (
            <Panel key={t} depth={5} className="p-[18px]">
              <div className="font-pixel text-[22px] text-gold-hi">{t}</div>
              <p className="m-0 mt-1.5 text-[13.5px] text-dust">{b}</p>
            </Panel>
          ))}
        </div>
      </Section>

      {/* ---------- 03 pass ---------- */}
      <Section id="pass" className="bg-[linear-gradient(180deg,#0E0B08_0%,#140F09_100%)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-10">
          <div>
            <SectionTitle kicker="03 — Whitelist Pass" title="Soulbound by rule">
              The pass is a ZRC-721 inscription airdropped to your address. Zcash has no smart contracts, so nothing on-chain can pin it there. The game enforces it
              instead: the pass only mines at the address it was sent to.
            </SectionTitle>
            <div className="mt-6 grid gap-3">
              {PASS_RULES.map((r) => (
                <Panel key={r.title} depth={4} className="flex gap-3.5 px-4 py-3.5">
                  <Dot color={r.color} />
                  <div>
                    <strong className="font-pixel text-[19px] font-semibold">{r.title}</strong>
                    <p className="m-0 mt-0.5 text-[13.5px] text-dust">{r.body}</p>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
          <Panel tone="gold" depth={8} className="overflow-hidden">
            <LazyVideo clip="zandy-pass" label="Zandy, the base character every pass comes with" className="aspect-square" />
            <div className="flex flex-wrap justify-between gap-3 border-t-3 border-black bg-ink px-4 py-3">
              <span className="font-pixel text-xl">Zandy — starter miner</span>
              <span className="text-xs tracking-[1px] text-khaki">1 PASS = 1 SLOT</span>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ---------- 04 token ---------- */}
      <Section id="token" className="bg-ink">
        <SectionTitle kicker="04 — $ZGEMS" title="One mint, ten billion, no reprints">
          The entire supply is minted to the treasury at genesis and published with its transaction IDs. Rewards are paid out of fixed pools in a double-entry
          ledger, so nothing is ever created later.
        </SectionTitle>
        <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6">
          <Panel className="p-6">
            <Kicker color="text-moss" className="text-[11px] tracking-[2px]">
              Allocation
            </Kicker>
            <h3 className="mb-4 mt-1.5 font-pixel text-[28px]">Where the 10B goes</h3>
            <div className="grid gap-3.5">
              {ALLOCATION.map((a) => (
                <div key={a.label}>
                  <div className="mb-1.5 flex justify-between gap-3 text-[13.5px]">
                    <span>{a.label}</span>
                    <span className="text-gold-hi">{a.pct}%</span>
                  </div>
                  <Bar pct={a.pct} color={a.color} />
                </div>
              ))}
            </div>
            <p className="m-0 mt-4 text-[12.5px] text-stone">Mining and daily rewards make up 90% of the supply. Nothing is set aside for sale.</p>
          </Panel>
          <Panel tone="coal-2" className="p-6">
            <Kicker color="text-moss" className="text-[11px] tracking-[2px]">
              Ledger pools
            </Kicker>
            <h3 className="mb-3 mt-1.5 font-pixel text-[28px]">How the game accounts for it</h3>
            <p className="mb-4 mt-0 text-[13.5px] text-dust">
              Inside the game, rewards are drawn from named ledger accounts. Each one is funded once at genesis and has a hard ceiling that cannot be topped up:
            </p>
            <div className="grid gap-2.5 text-[13.5px]">
              {ALLOCATION.map((a) => (
                <div key={a.label} className="border-3 border-black bg-ink px-3 py-2.5">
                  <div className="flex justify-between gap-3">
                    <span>{a.label}</span>
                    <span className="text-gold-hi">{a.amount}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-stone">{a.use}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-6">
          <Panel tone="gold" className="flex min-h-[230px] overflow-hidden">
            <LazyVideo clip="uses" label="Uses of $ZGEMS: tool upgrades, city upgrade, raffles" className="h-full" />
          </Panel>
          <Panel className="flex flex-col justify-center p-6">
            <h3 className="mb-2.5 mt-0 font-pixel text-[28px]">What $ZGEMS is for</h3>
            <ul className="m-0 grid gap-2 pl-[18px] text-sm text-dust">
              {TOKEN_USES.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <p className="m-0 mt-3.5 text-[12.5px] text-stone">Everything spent in the game leaves circulation. It never returns to the mining pool.</p>
          </Panel>
        </div>

        <Panel tone="coal-2" depth={8} className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-8 p-8">
          <div>
            <Kicker color="text-ember">Trading &amp; liquidity</Kicker>
            <p className="m-0 mt-3 font-pixel text-[clamp(23px,2.6vw,34px)] leading-[1.25] text-cream">{TRADING_LINE}</p>
          </div>
          <div className="grid gap-3 text-sm text-dust">
            <p className="m-0">
              That means no liquidity and no official price. It does not mean the token is locked. Once a weekly payout lands, the $ZGEMS in your wallet is yours to
              hold or move, and ZRC-20 marketplaces let holders list tokens person to person at whatever price they ask.
            </p>
            <p className="m-0">
              Nothing on this page is a promise of value. Until the liquidity allocation is unlocked after the NFT mint there is no pool to swap against.
            </p>
          </div>
        </Panel>
      </Section>

      {/* ---------- 05 miners ---------- */}
      <Section id="miners" className="bg-[radial-gradient(100%_70%_at_80%_0%,#1C150D_0%,#0E0B08_65%)]">
        <SectionTitle kicker="05 — The miners" title="Helmets, tools, gems, ores">
          Phase 2 brings the Miners NFT collection: {nft} miners, each one a mining unit built from traits that change how it works, not only how it looks.
        </SectionTitle>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          <Panel tone="dirt" className="overflow-hidden">
            <LazyVideo clip="miner-cave" label="A miner holding a gem in the deep cave" className="aspect-square" />
          </Panel>
          <Panel tone="amber" className="overflow-hidden">
            <LazyVideo clip="miner-sun" label="A miner with hat and pack at the surface camp" className="aspect-square" />
          </Panel>
          <Panel tone="gold" className="flex min-w-0 overflow-hidden">
            <LazyVideo clip="traits" label="Trait list: helmets, tools, gems, ores, characters and backgrounds" className="h-full" />
          </Panel>
        </div>
      </Section>

      {/* ---------- 06 roadmap ---------- */}
      <Section id="roadmap" className="bg-ink">
        <SectionTitle kicker="06 — Roadmap" title="Four phases" />
        <ol className="mt-11 grid list-none grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 p-0">
          {ROADMAP.map((r) => (
            <Panel as="li" key={r.phase} className={cx("border-t-8 p-5", r.active ? "border-t-gold" : "border-t-olive")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] tracking-[1.5px] text-khaki">{r.phase}</span>
                <span className={cx("text-[11px] tracking-[1px]", r.active ? "text-moss" : "text-stone")}>{r.status}</span>
              </div>
              <h3 className="mb-2.5 mt-2 font-pixel text-[26px]">{r.title}</h3>
              <ul className="m-0 grid gap-1.5 pl-4 text-[13.5px] text-dust">
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Panel>
          ))}
        </ol>
        <p className="mt-5 text-[12.5px] text-stone">We add dates only when they&apos;re firm, and every rule change is logged publicly before it happens.</p>
      </Section>

      {/* ---------- 07 proof ---------- */}
      <Section id="proof" className="bg-coal-3">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-center gap-9">
          <SectionTitle kicker="07 — Proof of reserves" kickerColor="text-moss" title="Transparent by default">
            $ZGEMS lives on Zcash&apos;s transparent layer, so the treasury balance and every payout are public. We publish them instead of asking you to take our
            word for it: treasury balance from our own indexer, ledger totals per pool, and the reserve checks that gate payouts.
          </SectionTitle>
          <LiveReserves />
        </div>
      </Section>

      {/* ---------- 08 building ---------- */}
      <Section id="building" className="bg-ink">
        <SectionTitle kicker="08 — How we're building it" title="No chain magic, plain engineering">
          Zcash has no smart contracts, so every rule in this game is server code we can be held to. Here is what runs behind the site.
        </SectionTitle>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          {BUILDING.map((b) => (
            <Panel key={b.title} depth={5} className="p-5">
              <h3 className="mb-2 mt-0 font-pixel text-[23px]">{b.title}</h3>
              <p className="m-0 text-[13.5px] text-dust">{b.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      {/* ---------- 09 raffles ---------- */}
      <Section id="raffles" className="bg-coal-3">
        <SectionTitle kicker="09 — Fair raffles" title="Recompute every winner yourself">
          Each draw uses data we can&apos;t change after the fact: a seed we commit to in advance and a Zcash block hash nobody controls.
        </SectionTitle>
        <ol className="mt-10 grid list-none grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 p-0">
          {RAFFLE_STEPS.map((s, i) => (
            <Panel as="li" key={s.title} depth={5} className="p-5">
              <div className="font-pixel text-3xl text-gold">{i + 1}</div>
              <h3 className="my-1.5 font-pixel text-[22px]">{s.title}</h3>
              <p className="m-0 text-[13.5px] text-dust">{s.body}</p>
            </Panel>
          ))}
        </ol>
        <Panel tone="ink" depth={5} className="mt-5 overflow-x-auto p-4 font-mono text-[13px] text-gold-hi">
          winner = HMAC-SHA256(seed, closing_block_hash + raffle_id) mod total_tickets
        </Panel>
        <p className="mt-3 text-[13px]">
          <Link href="/raffles">Verify past raffles in your browser ▸</Link>
        </p>
      </Section>

      {/* ---------- 10 waitlist ---------- */}
      <Section id="waitlist" className="bg-[linear-gradient(180deg,#140F09_0%,#0E0B08_100%)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-10">
          <div>
            <SectionTitle kicker="10 — Waitlist" title="Get on the pass list">
              Passes are airdropped, never sold. Finish the three tasks, leave your handle and your transparent address, and you are in the draw for the next batch.
            </SectionTitle>
            <Panel tone="coal-2" depth={5} className="mt-6 px-[18px] py-4">
              <div className="font-pixel text-xl text-gold-hi">Pass supply</div>
              <p className="m-0 mt-1 text-[13.5px] text-dust">
                The exact number of passes is confirmed before the airdrop and published here. One pass per account, one slot per pass.
              </p>
            </Panel>
          </div>
          <Panel depth={8} className="p-6">
            <WaitlistForm />
          </Panel>
        </div>
      </Section>

      {/* ---------- 11 what it is not ---------- */}
      <Section id="not" className="bg-ink">
        <SectionTitle kicker="11 — Clear boundaries" title="What ZecMiners is not" />
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
          {NOT_LIST.map((n) => (
            <Panel key={n.title} depth={4} className="p-4">
              <div className="font-pixel text-xl text-gold-hi">{n.title}</div>
              <p className="m-0 mt-1 text-[13px] text-dust">{n.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      {/* ---------- 12 faq ---------- */}
      <section id="faq" className="scroll-mt-20 border-b-3 border-black bg-ink py-24">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6">
          <Kicker>12 — FAQ</Kicker>
          <h2 className="mb-9 mt-2.5 font-pixel text-[clamp(32px,4.5vw,56px)] font-bold text-shadow-px">Questions people actually ask</h2>
          <Faq items={FAQ} />
        </div>
      </section>
    </>
  );
}
