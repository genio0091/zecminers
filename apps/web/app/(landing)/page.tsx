import Link from "next/link";
import { NFT_MINERS_SUPPLY } from "@zecminers/economy";
import { LazyVideo } from "@/components/lazy-video";
import { Countdown } from "@/components/site/countdown";
import { Deck, type DeckSheet } from "@/components/site/deck";
import { FaqPicker } from "@/components/site/faq-picker";
import { LiveReserves } from "@/components/site/live-reserves";
import { WaitlistForm } from "@/components/site/waitlist-form";
import { Bar, buttonClass, Dot, Kicker, Panel, cx } from "@/components/ui";
import {
  ALLOCATION,
  BUILDING,
  FAQ,
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

/** One screen of content: kicker, title, optional lead, body and an optional media column. */
function Sheet({
  kicker,
  kickerColor,
  title,
  lead,
  children,
  aside,
  asideOnMobile = false,
  leadOnMobile = true,
  className,
}: {
  kicker: string;
  kickerColor?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
  asideOnMobile?: boolean;
  /** Hide the lead on phones so the sheet fits one screen. */
  leadOnMobile?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto flex min-h-full w-full max-w-[1120px] flex-col justify-center px-4 py-4 sm:px-8 sm:py-6 lg:py-8 short:lg:py-4", className)}>
      <div className={cx("grid items-center gap-5 lg:gap-8", aside ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : null)}>
        <div className="min-w-0">
          <Kicker color={kickerColor} className="text-[11px] sm:text-xs">
            {kicker}
          </Kicker>
          <h2 className="mt-1 font-pixel text-[26px] font-bold leading-[1.05] text-shadow-px sm:mt-1.5 sm:text-[40px] lg:text-[46px] short:lg:text-[36px]">{title}</h2>
          {lead ? <p className={cx("mb-0 mt-2 max-w-[640px] text-[13px] text-dust sm:mt-2.5 sm:text-[15px]", !leadOnMobile && "hidden sm:block")}>{lead}</p> : null}
          <div className="mt-3 sm:mt-5 short:sm:mt-3">{children}</div>
        </div>
        {aside ? <div className={cx("min-w-0", asideOnMobile ? "order-first lg:order-none" : "hidden lg:block")}>{aside}</div> : null}
      </div>
    </div>
  );
}

function Small({ title, children, tone = "coal", accent }: { title: string; children: React.ReactNode; tone?: "coal" | "coal-2"; accent?: string }) {
  return (
    <Panel tone={tone} depth={4} className="p-3 sm:p-4">
      <div className={cx("font-pixel text-[17px] leading-tight sm:text-[20px]", accent)}>{title}</div>
      <div className="mt-1 text-[12.5px] leading-snug text-dust sm:text-[13px]">{children}</div>
    </Panel>
  );
}

export default async function Home() {
  const { params, payoutDay } = await siteConfig();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const sheets: DeckSheet[] = [
    {
      id: "home",
      label: "Home",
      aliases: ["top"],
      content: (
        <div className="relative flex min-h-full items-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#2A2109_0%,#0E0B08_72%)]" />
          <LazyVideo clip="mine-loop" eager label="Pixel-art mine: a miner works the surface camp beside a rail track" className="absolute inset-0 h-full opacity-40" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0E0B08_10%,rgba(14,11,8,.85)_55%,rgba(14,11,8,.45)_100%)]" />
          <div className="scanlines pointer-events-none absolute inset-0" />
          <div className="relative mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-8">
            <div className="max-w-[720px]">
              <div className="inline-flex items-center gap-2.5 border-3 border-black bg-coal px-3 py-1.5 text-[11px] uppercase tracking-[2px] text-gold-hi shadow-px-4">
                <span className="block size-[9px] animate-blink bg-moss" />
                ZRC-20 token on Zcash mainnet
              </div>
              <h1 className="mt-4 font-pixel text-[32px] font-bold leading-[1.03] tracking-[-0.5px] text-shadow-px-lg sm:text-[56px] lg:text-[68px] short:lg:text-[50px]">
                Mine <span className="text-gold">$ZGEMS</span> in the browser. Paid to your wallet every week.
              </h1>
              <p className="mt-4 max-w-[600px] text-[14px] text-sand sm:text-[17px] short:lg:mt-3 short:lg:text-[15px]">
                A pixel mining game. Holders of the soulbound Whitelist Pass run {params.sessionHours}-hour mining sessions, and everything they mine is sent to
                their Zcash wallet in a weekly batch.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="#waitlist" className={buttonClass("gold", "md")}>
                  Join the waitlist
                </a>
                <Link href="/play" className={buttonClass("dark", "md")}>
                  Play ▸
                </Link>
              </div>
              <div className="mt-6 grid max-w-[640px] grid-cols-2 gap-2.5 sm:grid-cols-4 short:lg:mt-4">
                {[
                  ["Total supply", "10B"],
                  ["Standard", "ZRC-20"],
                  ["Session", `${params.sessionHours} h`],
                  ["Payouts", "Weekly"],
                ].map(([k, v]) => (
                  <Panel key={k} depth={3} className="px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[1.5px] text-khaki">{k}</div>
                    <div className="font-pixel text-xl text-gold-hi">{v}</div>
                  </Panel>
                ))}
              </div>
              <div className="mt-5 hidden flex-wrap gap-2 text-[11px] uppercase tracking-[1px] sm:flex short:lg:mt-3">
                {[
                  ["play", "How to play"],
                  ["payouts", "Payouts"],
                  ["pass", "The pass"],
                  ["token", "$ZGEMS"],
                  ["roadmap", "Roadmap"],
                  ["faq", "FAQ"],
                ].map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="border-3 border-black bg-ink/80 px-2.5 py-1 text-cream hover:bg-coal-hover">
                    {label} ▸
                  </a>
                ))}
              </div>
              <p className="mb-0 mt-4 text-[11px] text-stone">
                <span className="sm:hidden">Swipe or tap ▸ to flip pages · tap the page number for all sections.</span>
                <span className="hidden sm:inline">Tip: pick a section, or use the ◂ ▸ keys to flip pages.</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "play",
      label: "How to play",
      content: (
        <Sheet kicker="01 — How you play" title="Four steps, wallet first" leadOnMobile={false} lead="Your wallet address is the account that matters: the pass is airdropped to it, and every payout goes back to it.">
          <ol className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {PLAY_STEPS.map((s) => (
              <Panel as="li" key={s.n} depth={4} className="flex gap-3 p-3 sm:block sm:p-4">
                <div className="font-pixel text-[26px] leading-none text-gold sm:text-[36px]">{s.n}</div>
                <div>
                  <h3 className="m-0 font-pixel text-[18px] sm:mt-2 sm:text-[21px]">{s.title}</h3>
                  <p className="mb-0 mt-1 text-[12.5px] leading-snug text-dust sm:text-[13px]">{s.body}</p>
                </div>
              </Panel>
            ))}
          </ol>
        </Sheet>
      ),
    },
    {
      id: "mining",
      label: "Mining & rates",
      content: (
        <Sheet
          kicker="02 — Mining"
          title="Rates are set on the server"
          asideOnMobile
          aside={
            <Panel tone="gold" className="overflow-hidden">
              <LazyVideo clip="rate-explainer" label="A miner's hourly rate, shown as an example of 500 per hour" className="aspect-video max-h-[190px] sm:max-h-none" />
            </Panel>
          }
        >
          <p className="m-0 text-[13.5px] text-dust sm:text-sm">
            The client never sends an amount. The current development rate is <strong className="text-gold-hi">{params.baseRatePerHour} $ZGEMS per hour</strong> at
            level 1; the 500 per hour in the art is an example.
          </p>
          <ul className="mb-0 mt-3 grid gap-1.5 pl-[18px] text-[13px] text-dust sm:text-sm">
            <li>One session per slot per day, reset at 00:00 UTC</li>
            <li>Collect any time; pickaxes wear down and can be repaired or upgraded</li>
            <li>Daily login reward with a streak bonus, pass holders only</li>
            <li>If the mining pool empties, mining stops. No new tokens are ever minted.</li>
          </ul>
        </Sheet>
      ),
    },
    {
      id: "payouts",
      label: "Weekly payouts",
      content: (
        <Sheet
          kicker="03 — Weekly payouts"
          title="How weekly payouts work"
          leadOnMobile={false}
          lead="Mined $ZGEMS waits in your in-game balance, backed 1:1 by the treasury, until the weekly batch sends it on-chain."
        >
          <Panel depth={4} className="mb-3 inline-block px-3.5 py-2">
            <div className="text-[10px] uppercase tracking-[1.5px] text-khaki">Next cutoff · {payoutDay} 00:00 UTC</div>
            <Countdown weekday={params.payout.weekday} className="font-pixel text-[24px] tracking-[1px] text-gold-hi sm:text-[28px]" />
          </Panel>
          <ol className="m-0 grid list-none gap-2 p-0 lg:grid-cols-5">
            {PAYOUT_STEPS.map((s, i) => (
              <Panel as="li" key={s.step} tone={s.done ? "coal-2" : "coal"} depth={3} className="flex gap-3 px-3 py-2 lg:block lg:py-3">
                <span className={cx("font-pixel text-[20px] leading-none", s.done ? "text-moss" : "text-gold")}>{i + 1}</span>
                <div>
                  <div className="font-pixel text-[17px] leading-tight lg:mt-1.5">{s.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-dust"><span className="sm:hidden">{s.short}</span><span className="hidden sm:inline">{s.body}</span></div>
                </div>
              </Panel>
            ))}
          </ol>
          <div className="mt-3 hidden flex-wrap gap-2 text-[11.5px] sm:flex">
            {["Network fees paid by the project", "Always sent to your pass address", "Keep it in a ZRC-20 wallet"].map((t) => (
              <span key={t} className="border-3 border-black bg-ink px-2 py-1 text-gold-hi">
                ✓ {t}
              </span>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "pass",
      label: "The pass",
      content: (
        <Sheet
          kicker="04 — Whitelist Pass"
          title="Soulbound by rule"
          leadOnMobile={false}
          lead="A ZRC-721 inscription airdropped to your address. Zcash has no smart contracts, so the game enforces it: the pass only mines at the address it was sent to."
          aside={
            <Panel tone="gold" depth={6} className="mx-auto max-w-[360px] overflow-hidden">
              <LazyVideo clip="zandy-pass" label="Zandy, the base character every pass comes with" className="aspect-square" />
              <div className="flex justify-between gap-3 border-t-3 border-black bg-ink px-3 py-2">
                <span className="font-pixel text-lg">Zandy — starter miner</span>
                <span className="text-[11px] tracking-[1px] text-khaki">1 PASS = 1 SLOT</span>
              </div>
            </Panel>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {PASS_RULES.map((r) => (
              <Panel key={r.title} depth={3} className="flex gap-3 px-3 py-2.5">
                <Dot color={r.color} />
                <div>
                  <strong className="font-pixel text-[16px] font-semibold sm:text-[17px]">{r.title}</strong>
                  <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-dust">{r.body}</p>
                </div>
              </Panel>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "token",
      label: "$ZGEMS",
      content: (
        <Sheet
          kicker="05 — $ZGEMS"
          title="One mint, ten billion, no reprints"
          lead="The whole supply is minted to the treasury at genesis. Rewards come from fixed pools that can never be topped up."
        >
          <Panel className="p-4 sm:p-5">
            <div className="grid gap-3">
              {ALLOCATION.map((a) => (
                <div key={a.label}>
                  <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-[13px]">
                    <span>{a.label}</span>
                    <span className="text-gold-hi">
                      {a.pct}% · {a.amount}
                    </span>
                  </div>
                  <Bar pct={a.pct} color={a.color} className="h-3" />
                  <div className="mt-1 text-[11.5px] leading-snug text-stone">{a.use}</div>
                </div>
              ))}
            </div>
          </Panel>
          <p className="mb-0 mt-3 text-[12px] text-stone">Mining and daily rewards are 90% of the supply. There is no presale and nothing is set aside for sale.</p>
        </Sheet>
      ),
    },
    {
      id: "uses",
      label: "Uses & trading",
      aliases: ["trading"],
      content: (
        <Sheet
          kicker="06 — Uses & trading"
          kickerColor="text-ember"
          title="What $ZGEMS is for"
          aside={
            <Panel tone="gold" className="overflow-hidden">
              <LazyVideo clip="uses" label="Uses of $ZGEMS: tool upgrades, city upgrade, raffles" />
            </Panel>
          }
        >
          <ul className="m-0 grid gap-1.5 pl-[18px] text-[13px] text-dust sm:text-sm">
            {TOKEN_USES.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <Panel tone="coal-2" depth={5} className="mt-4 p-4">
            <p className="m-0 font-pixel text-[20px] leading-[1.25] text-cream sm:text-[24px]">{TRADING_LINE}</p>
            <p className="mb-0 mt-2 text-[12.5px] leading-snug text-dust">
              No liquidity and no official price — not a lock. After a weekly payout the tokens in your wallet are yours, and ZRC-20 marketplaces let holders
              list them person to person. Nothing here is a promise of value.
            </p>
          </Panel>
        </Sheet>
      ),
    },
    {
      id: "miners",
      label: "The miners (NFT)",
      content: (
        <Sheet
          kicker="07 — The miners"
          title="Helmets, tools, gems, ores"
          lead={`Phase 2 brings the Miners collection: ${nft} miners, each a mining unit whose traits change how it works, not only how it looks.`}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1.6fr]">
            <Panel tone="dirt" depth={4} className="overflow-hidden">
              <LazyVideo clip="miner-cave" label="A miner holding a gem in the deep cave" className="aspect-square" />
            </Panel>
            <Panel tone="amber" depth={4} className="overflow-hidden">
              <LazyVideo clip="miner-sun" label="A miner with hat and pack at the surface camp" className="aspect-square" />
            </Panel>
            <Panel tone="gold" depth={4} className="col-span-2 flex overflow-hidden lg:col-span-1">
              <LazyVideo clip="traits" label="Trait list: helmets, tools, gems, ores, characters and backgrounds" className="max-h-[170px] lg:max-h-none" />
            </Panel>
          </div>
        </Sheet>
      ),
    },
    {
      id: "roadmap",
      label: "Roadmap",
      content: (
        <Sheet kicker="08 — Roadmap" title="Four phases">
          <ol className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {ROADMAP.map((r) => (
              <Panel as="li" key={r.phase} depth={4} className={cx("border-t-[6px] px-3 py-2 sm:p-3", r.active ? "border-t-gold" : "border-t-olive")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] tracking-[1.5px] text-khaki">{r.phase}</span>
                  <span className={cx("text-[10px] tracking-[1px]", r.active ? "text-moss" : "text-stone")}>{r.status}</span>
                </div>
                <h3 className="mb-1.5 mt-1 font-pixel text-[19px] leading-tight sm:text-[21px]">{r.title}</h3>
                <p className="m-0 text-[12px] leading-snug text-dust sm:hidden">{r.summary}</p>
                <ul className="m-0 hidden gap-1 pl-4 text-[12px] leading-snug text-dust sm:grid">
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Panel>
            ))}
          </ol>
        </Sheet>
      ),
    },
    {
      id: "proof",
      label: "Proof of reserves",
      content: (
        <Sheet
          kicker="09 — Proof of reserves"
          kickerColor="text-moss"
          title="Transparent by default"
          leadOnMobile={false}
          lead="The treasury and every payout are public on Zcash's transparent layer. We publish them, with the reserve checks that gate every payout."
        >
          <LiveReserves compact />
        </Sheet>
      ),
    },
    {
      id: "building",
      label: "How it's built",
      content: (
        <Sheet
          kicker="10 — How we're building it"
          title="No chain magic, plain engineering"
          leadOnMobile={false}
          lead="Zcash has no smart contracts, so every rule is server code we can be held to."
        >
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {BUILDING.map((b) => (
              <Small key={b.title} title={b.title}>
                <span className="sm:hidden">{b.short}</span><span className="hidden sm:inline">{b.body}</span>
              </Small>
            ))}
          </div>
        </Sheet>
      ),
    },
    {
      id: "raffles",
      label: "Fair raffles",
      content: (
        <Sheet kicker="11 — Fair raffles" title="Recompute every winner yourself">
          <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-5">
            {RAFFLE_STEPS.map((s, i) => (
              <Panel as="li" key={s.title} depth={3} className="flex gap-3 px-3 py-2 sm:block sm:py-2.5">
                <span className="font-pixel text-[22px] leading-none text-gold">{i + 1}</span>
                <div>
                  <div className="font-pixel text-[17px] leading-tight sm:mt-1.5">{s.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-dust"><span className="sm:hidden">{s.short}</span><span className="hidden sm:inline">{s.body}</span></div>
                </div>
              </Panel>
            ))}
          </ol>
          <Panel tone="ink" depth={4} className="mt-3 overflow-x-auto p-3 font-mono text-[12px] text-gold-hi sm:text-[13px]">
            winner = HMAC-SHA256(seed, closing_block_hash + raffle_id) mod total_tickets
          </Panel>
          <p className="mb-0 mt-3 text-[13px]">
            <Link href="/raffles">Verify past raffles in your browser ▸</Link>
          </p>
        </Sheet>
      ),
    },
    {
      id: "waitlist",
      label: "Join the waitlist",
      content: (
        <Sheet
          kicker="12 — Waitlist"
          title="Get on the pass list"
          leadOnMobile={false}
          lead="Passes are airdropped, never sold. Finish the tasks, leave your handle and t1 address, and you're in the draw."
          aside={
            <Panel tone="coal-2" depth={5} className="p-4">
              <div className="font-pixel text-xl text-gold-hi">Pass supply</div>
              <p className="mb-0 mt-1 text-[13px] text-dust">
                The exact number of passes is published before the airdrop. One pass per account, one slot per pass.
              </p>
            </Panel>
          }
        >
          <Panel depth={6} className="p-3 sm:p-5">
            <WaitlistForm compact />
          </Panel>
        </Sheet>
      ),
    },
    {
      id: "faq",
      label: "FAQ",
      content: (
        <Sheet kicker="13 — FAQ" title="Questions people actually ask">
          <FaqPicker items={FAQ} />
        </Sheet>
      ),
    },
    {
      id: "not",
      label: "Fine print",
      content: (
        <Sheet kicker="14 — Clear boundaries" title="What ZecMiners is not">
          <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3">
            {NOT_LIST.map((n) => (
              <li key={n.title} className="border-3 border-black bg-coal px-3 py-2 shadow-px-3">
                <span className="font-pixel text-[15px] text-gold-hi sm:text-[18px]">✕ {n.title}</span>
                <span className="block text-[11.5px] leading-snug text-dust sm:text-[12.5px]">{n.body}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-1 text-[11px] leading-snug text-stone sm:mt-4 sm:gap-1.5 sm:text-[11.5px]">
            <p className="m-0">
              Keep your pass and your $ZGEMS in a ZRC-20 wallet such as Zatoshi Wallet. Wallets that select coins blindly can spend an inscription and destroy it.
            </p>
            <p className="m-0">{TRADING_LINE} Nothing on this site is financial advice or a promise of value; values marked as examples can change before launch.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            <Link href="/docs">Docs</Link>
            <Link href="/proof-of-reserves">Proof of reserves</Link>
            <Link href="/raffles">Raffles</Link>
            <Link href="/play">Play</Link>
            {process.env.NEXT_PUBLIC_X_URL ? <a href={process.env.NEXT_PUBLIC_X_URL}>X / Twitter</a> : null}
            {process.env.NEXT_PUBLIC_DISCORD_URL ? <a href={process.env.NEXT_PUBLIC_DISCORD_URL}>Discord</a> : null}
          </div>
        </Sheet>
      ),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Deck
        sheets={sheets}
        railFoot={
          <>
            {TRADING_LINE} Independent project, not affiliated with any Zcash organization.
          </>
        }
      />
    </>
  );
}
