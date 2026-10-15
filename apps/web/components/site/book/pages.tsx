"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { ALLOCATION, DAILY_POOL_TEXT } from "@/lib/content";
import { clipSrc, playMuted, posterSrc, type Clip } from "@/lib/media";
import { cx } from "../../ui";

export interface BookClaim {
  memberNo: number | null;
  handle: string | null;
  wallet: string | null;
}

export interface BookLinks {
  x: string | null;
  discord: string | null;
}

// ------------------------------------------------------------------ clips

/** Which pages are open (playing) and which are close enough to start loading. */
export const PageView = createContext<{ visible: number[]; near: (page: number) => boolean }>({ visible: [0, 1], near: () => true });

/**
 * A gameplay clip on a page. It plays while its page is open and pauses when the page turns away;
 * neighbouring pages load ahead so the next spread is already moving when it opens.
 */
function PageVideo({ page, clip, label, className, style }: { page: number; clip: Clip; label: string; className?: string; style?: React.CSSProperties }) {
  const { visible, near } = useContext(PageView);
  const ref = useRef<HTMLVideoElement>(null);
  const open = visible.includes(page);
  const preload = near(page) ? "auto" : "none";

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (open) playMuted(v);
    else if (!v.paused) v.pause();
  }, [open]);

  return (
    <video
      ref={ref}
      src={clipSrc(clip)}
      poster={posterSrc(clip)}
      muted
      loop
      playsInline
      preload={preload}
      onCanPlay={(e) => {
        if (open && e.currentTarget.paused) playMuted(e.currentTarget);
      }}
      aria-label={label}
      className={cx("block size-full object-cover pixelated", className)}
      style={style}
    />
  );
}

// ------------------------------------------------------------------ page shell

function Page({ n, head, children, foot }: { n: number; head: [string, string]; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className={cx("hv-page", n % 2 === 0 ? "hv-page-l" : "hv-page-r")}>
      <div className="hv-head">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      {children}
      {foot ?? <div className="hv-no">{n + 1}</div>}
    </div>
  );
}

const framed = "border-4 border-night shadow-[6px_6px_0_#1A1208]";
const darkCard = "flex min-h-0 flex-1 flex-col border-4 border-night";
const tag = "border-2 border-black bg-night font-mono tracking-[1.5px] text-cream";
const goldBtn = "block border-3 border-night bg-gold font-pixel text-[26px] leading-none text-night shadow-[5px_5px_0_#1A1208] hover:bg-gold-hi";
const nightBtn = "cursor-pointer border-3 border-night bg-night font-pixel leading-none text-gold shadow-[5px_5px_0_#C98500] hover:text-gold-hi";
const monoBtn = "block border-3 border-night px-3 py-[11px] text-center font-mono text-xs tracking-[1px] text-night";

function Br({ a, b }: { a: string; b: string }) {
  return (
    <>
      {a}
      <br />
      {b}
    </>
  );
}

// ------------------------------------------------------------------ the pages

/** Page 1 · the title page, glued to the left board. */
function TitlePage({ onJoin }: { onJoin: () => void }) {
  return (
    <Page
      n={0}
      head={["HOOD VALLEY", "FIELD JOURNAL · VOL. 1"]}
      foot={
        <div className="flex items-center justify-between gap-3">
          <span className="font-pixel text-[22px] text-ink-link">1</span>
          <span className="animate-nudge font-mono text-[11px] tracking-[1.5px] text-umber">TURN THE PAGE →</span>
        </div>
      }
    >
      <div className="hv-body gap-[18px]">
        <div className="inline-flex items-center gap-2 self-start bg-night px-2.5 py-1.5 font-mono text-[11px] tracking-[1.5px] text-gold">
          <span aria-hidden className="block size-2 bg-moss" />
          ON-CHAIN MINING GAME · ROBINHOOD CHAIN
        </div>
        <h1 className="hv-title">
          <Br a="MINE THE" b="FRONTIER" />
        </h1>
        <p className="m-0 max-w-[420px] text-lg leading-normal text-umber-3">
          3,333 Valley Miners. One 12-hour shift a day. 7,000,000,000 $VALLEY to mine in Season 1.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onJoin} className={cx(nightBtn, "px-[18px] py-3 text-[26px]")}>
            JOIN THE ALLOWLIST
          </button>
          <Link href="/litepaper" className={cx(goldBtn, "px-[18px] py-3")}>
            READ THE LITEPAPER
          </Link>
        </div>
        <p className="m-0 font-mono text-[11.5px] tracking-[1px] text-umber">MINT DATE TBA · MINT PRICE TBA</p>
      </div>
    </Page>
  );
}

function ValleyMapPage() {
  return (
    <Page n={1} head={["THE VALLEY", "ART IN DEVELOPMENT"]}>
      <div className={cx(framed, "relative min-h-0 flex-1 overflow-hidden bg-valley-lit")}>
        <PageVideo page={1} clip="valley-map" label="Pixel-art valley map: a miner works beside a mine entrance and a rail track" className="absolute inset-0" />
        <span className={cx(tag, "absolute left-3 top-3 px-[9px] py-[5px] text-[10.5px]")}>VALLEY MAP</span>
        <span className="absolute inset-x-3 bottom-3 border-2 border-black bg-night px-2.5 py-2 text-[13.5px] text-cream">Where every shift begins.</span>
      </div>
    </Page>
  );
}

function CrewPage() {
  return (
    <Page n={2} head={["01 · THE CREW", "HOOD VALLEY"]}>
      <div className="hv-body gap-5">
        <h2 className="hv-h">
          <Br a="STAKE A CLAIM." b="DIG DEEP." />
        </h2>
        <p className="m-0 max-w-[440px] text-[19px] leading-[1.6]">Beneath the rugged expanses of Hood Valley lies an untapped grid of high-value resource deposits.</p>
        <p className="m-0 max-w-[440px] text-[19px] leading-[1.6]">
          Guided by explorer <strong className="bg-gold px-1">Zandy</strong>, a crew of 3,333 Miners sets out to stake claims, dig deep, and extract wealth from the frontier.
        </p>
      </div>
    </Page>
  );
}

function GuidePage() {
  return (
    <Page n={3} head={["01 · THE CREW", "MEET THE GUIDE"]}>
      <div className="hv-body">
        <figure className={cx(framed, "m-0 bg-gold")}>
          <div className="mx-auto aspect-square max-h-[440px] overflow-hidden">
            <PageVideo page={3} clip="zandy" label="Zandy, the base character, in pixel art" style={{ transform: "scale(1.9)" }} />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2.5 border-t-4 border-night bg-night px-3.5 py-2.5 text-cream">
            <span className="font-pixel text-[28px] leading-none text-gold">ZANDY</span>
            <span className="font-mono text-[11px] tracking-[1.5px]">EXPLORER · LEADS THE CREW</span>
          </figcaption>
        </figure>
      </div>
    </Page>
  );
}

const PERKS: { icon: React.ReactNode; title: string; note: string }[] = [
  { icon: <path d="M3 9c5-5 13-5 18 0M12 5v16" />, title: "Daily mining rights", note: "every 12-hour shift" },
  { icon: <path d="M3 7h18v3.5a2 2 0 0 0 0 3V17H3v-3.5a2 2 0 0 0 0-3zM15 7v10" />, title: "Raffles & airdrops", note: "8% of supply" },
  { icon: <path d="M5 13l7-7 7 7M5 19l7-7 7 7" />, title: "Season 2 priority", note: "early access" },
  { icon: <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />, title: "Liquidity flow", note: "tokenomics + presale" },
];

function MinersPage() {
  return (
    <Page n={4} head={["02 · THE MINERS", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <h2 className="hv-h">
          <Br a="ONE NFT." b="ONE WORKER LICENSE." />
        </h2>
        <p className="m-0 max-w-[440px] text-[17px] text-umber-3">3,333 unique Valley Miners on Robinhood Chain. Holding one is how you get into the daily shift.</p>
        <ul className="m-0 grid list-none gap-2 p-0">
          {PERKS.map((p) => (
            <li key={p.title} className="flex items-center gap-3 border-3 border-night bg-paper-2 px-3 py-2.5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A1208" strokeWidth="2.2" strokeLinecap="square" aria-hidden className="flex-none">
                {p.icon}
              </svg>
              <span>
                <strong>{p.title}</strong> <span className="text-umber-2">· {p.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}

function LicensePage() {
  const rows = [
    ["MINER", "No. ____ of 3,333"],
    ["NETWORK", "ROBINHOOD CHAIN"],
    ["SHIFT RIGHTS", "DAILY · 12 H"],
    ["SEASON", "1 · GENESIS"],
  ];
  return (
    <Page n={5} head={["02 · THE MINERS", "SAMPLE LICENSE"]}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <article aria-label="Sample worker license" className="w-[min(280px,82%)] -rotate-3 border-4 border-night bg-paper shadow-[10px_10px_0_#1A1208]">
          <div className="flex justify-between gap-2 bg-night px-[11px] py-[7px] font-mono text-[10px] tracking-[1.5px] text-gold">
            <span>HOOD VALLEY</span>
            <span>WORKER LICENSE</span>
          </div>
          <div className="aspect-square max-h-[250px] overflow-hidden border-b-4 border-night bg-sun">
            <PageVideo page={5} clip="miner-sun" label="A miner with a wide-brim hat and pack at the surface camp" />
          </div>
          <div className="grid gap-1 px-3 py-2.5 font-mono text-[11px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2.5">
                <span className="text-umber">{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
          </div>
        </article>
        <p className="mb-0 mt-1.5 text-center font-mono text-[11px] tracking-[.5px] text-umber">Traits and their mining effects are confirmed before mint.</p>
      </div>
    </Page>
  );
}

const MOVES = [
  ["Deploy.", "Commit your Miner while the 12-hour window is open."],
  ["Extract.", "It digs through the whole window."],
  ["Claim.", "Take your share of the day's $VALLEY pool."],
  ["Gear up.", "Prep for tomorrow and keep your streak."],
];

function ShiftPage() {
  return (
    <Page n={6} head={["03 · THE DAILY SHIFT", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <h2 className="hv-h">
          <Br a="ONE SHIFT." b="FOUR MOVES." />
        </h2>
        <ol className="m-0 grid list-none gap-2 p-0">
          {MOVES.map(([lead, body], i) => (
            <li key={lead} className={cx("grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 py-2", i < MOVES.length - 1 && "border-b-3 border-night")}>
              <span className="font-pixel text-[42px] leading-[.9] text-amber">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <strong className="text-[17px]">{lead}</strong> {body}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Page>
  );
}

function DialPage() {
  return (
    <Page n={7} head={["03 · THE DAILY SHIFT", "24-HOUR DAY"]}>
      <div className={cx(darkCard, "items-center justify-center gap-4 bg-night p-5 text-cream shadow-[6px_6px_0_#C98500]")}>
        <svg viewBox="0 0 200 200" role="img" aria-label="24-hour dial: a 12-hour mining window, then 12 hours off-shift to gear up" className="block h-auto w-[min(300px,100%)]">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#5A4428" strokeWidth="5" strokeDasharray="1.6 23.27" />
          <circle cx="100" cy="100" r="76" fill="none" stroke="#6FD6F2" strokeWidth="22" strokeDasharray="238.76 477.52" strokeDashoffset="-238.76" transform="rotate(-90 100 100)" />
          <circle cx="100" cy="100" r="76" fill="none" stroke="#F2B949" strokeWidth="22" strokeDasharray="238.76 477.52" transform="rotate(-90 100 100)" />
          <text x="100" y="98" textAnchor="middle" fill="#FFF4DA" className="font-pixel" fontSize="46">
            12 H
          </text>
          <text x="100" y="120" textAnchor="middle" fill="#D9C6A0" className="font-mono" fontSize="9" letterSpacing="1.5">
            MINING WINDOW
          </text>
        </svg>
        <div className="grid gap-2 self-stretch font-mono text-xs tracking-[1px]">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="block size-3.5 flex-none bg-gold" />
            Mining window · 12 h · deploy, extract, claim
          </div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="block size-3.5 flex-none bg-sky" />
            Off-shift · 12 h · gear up for tomorrow
          </div>
        </div>
        <p className="m-0 font-mono text-[11px] text-khaki">Exact shift and snapshot times: TBA</p>
      </div>
    </Page>
  );
}

function SeasonPage() {
  const rows = [
    ["Season 1 pool", "7,000,000,000 $VALLEY"],
    ["Share of supply", "70%"],
    ["Duration", "180 days"],
  ];
  return (
    <Page n={8} head={["04 · SEASON 1", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <h2 className="hv-h">
          <Br a="SEVEN BILLION." b="180 DAYS." />
        </h2>
        <dl className="m-0 grid border-3 border-night">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b-2 border-paper-line px-3 py-2.5">
              <dt className="text-umber-2">{k}</dt>
              <dd className="m-0 font-bold">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 bg-gold px-3 py-2.5">
            <dt>Mined per day</dt>
            <dd className="m-0 font-extrabold">~{DAILY_POOL_TEXT}</dd>
          </div>
        </dl>
        <p className="m-0 max-w-[440px] text-base text-umber-3">When the pool is mined out, $VALLEY mining closes for good and Season 2 begins.</p>
      </div>
    </Page>
  );
}

const POOL = 7_000_000_000;
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

/** The 180-day seam: one block per day of Season 1; hover or drag to see how much is mined by then. */
function SeamPage() {
  const [day, setDay] = useState(45);
  const mined = Math.round((day * POOL) / 180);
  return (
    <Page n={9} head={["04 · SEASON 1", "THE 180-DAY SEAM"]}>
      <div className={cx(darkCard, "justify-center gap-3 bg-night p-[18px] text-cream shadow-[6px_6px_0_#C98500]")}>
        <div aria-hidden className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
          {Array.from({ length: 180 }, (_, i) => {
            const d = i + 1;
            return (
              <span
                key={d}
                title={`Day ${d} · ${fmt((d * POOL) / 180)} $VALLEY mined`}
                onMouseEnter={() => setDay(d)}
                className={cx("block aspect-square cursor-crosshair", d === day ? "bg-gold-hi" : d < day ? "bg-amber" : "bg-unmined")}
              />
            );
          })}
        </div>
        <label className="grid gap-1 font-mono text-[11px] tracking-[1px] text-dust">
          <span>Day {day} of 180 · drag or hover the blocks</span>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={day}
            onChange={(e) => setDay(Math.max(0, Math.min(180, Number(e.target.value) || 0)))}
            className="h-6 w-full accent-gold"
          />
        </label>
        <div aria-live="polite" className="grid grid-cols-2 gap-2">
          <div className="border-2 border-clay px-2.5 py-2">
            <div className="font-mono text-[10px] tracking-[1px] text-khaki">MINED</div>
            <div className="font-bold">{fmt(mined)}</div>
          </div>
          <div className="border-2 border-clay px-2.5 py-2">
            <div className="font-mono text-[10px] tracking-[1px] text-khaki">LEFT</div>
            <div className="font-bold">{fmt(POOL - mined)}</div>
          </div>
        </div>
        <p className="m-0 text-xs leading-normal text-khaki">1 block = 1 day ≈ 38.9M $VALLEY. If all 3,333 Miners work evenly, that is ≈ 11,668 each per day.</p>
      </div>
    </Page>
  );
}

function TokenPage() {
  return (
    <Page n={10} head={["05 · $VALLEY", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <h2 className="hv-h">
          <Br a="TEN BILLION." b="FIXED SUPPLY." />
        </h2>
        <p className="m-0 text-base text-umber-3">10,000,000,000 $VALLEY in total. Every token has a job:</p>
        <ul className="m-0 grid list-none border-3 border-night p-0">
          {ALLOCATION.map((a, i) => (
            <li key={a.code} className={cx("grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-[9px]", i < ALLOCATION.length - 1 && "border-b-2 border-paper-line")}>
              <span aria-hidden className="block size-3.5" style={{ background: a.color }} />
              <span>{a.name}</span>
              <span className="tabular font-bold">{a.share}%</span>
            </li>
          ))}
        </ul>
        <Link href="/litepaper#tokenomics" className="self-start border-b-2 border-ink-link pb-0.5 font-mono text-xs tracking-[1px] text-ink-link hover:text-night">
          FULL TABLE IN THE LITEPAPER →
        </Link>
      </div>
    </Page>
  );
}

const CORE_NOTES: Record<string, string> = {
  pool_mining: "In-game mining · 7B",
  pool_liquidity: "Liquidity · 1.5B",
  pool_community: "Raffles & holders · 800M",
  pool_presale_lp: "Presale LP · 500M",
  pool_team: "Core team · 200M",
};

function CorePage() {
  return (
    <Page n={11} head={["05 · $VALLEY", "CORE SAMPLE"]}>
      <div className={cx(darkCard, "gap-3 bg-vault px-[22px] py-5 text-cream shadow-[6px_6px_0_#C98500]")}>
        <div
          role="img"
          aria-label={`Supply split as a core sample: ${ALLOCATION.map((a) => `${a.name} ${a.share}%`).join(", ")}`}
          className="grid min-h-[220px] flex-1 grid-cols-[96px_minmax(0,1fr)] gap-4"
        >
          <div className="flex flex-col gap-0.5 border-3 border-black">
            {ALLOCATION.map((a) => (
              <span key={a.code} className="block min-h-1.5" style={{ flex: `${a.share} 1 0px`, background: a.color }} />
            ))}
          </div>
          <div aria-hidden className="flex flex-col gap-0.5 py-[3px] text-[13px] leading-[14px]">
            {ALLOCATION.map((a, i) => (
              <span key={a.code} className="flex min-h-1.5 items-center gap-2" style={{ flex: `${a.share} 1 0px` }}>
                <strong className={i === 0 ? "text-[30px] leading-none" : undefined}>{a.share}%</strong>
                <span className="text-dust">{CORE_NOTES[a.code]}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="m-0 font-mono text-[11px] text-khaki">A core sample of the vault, drilled top to bottom.</p>
      </div>
    </Page>
  );
}

const STAGES: { tag: string; title: string; body: string; tone?: "now" | "sky" }[] = [
  { tag: "NOW", title: "Platform build.", body: "Web platform and dApp in development.", tone: "now" },
  { tag: "NEXT", title: "Confirmations.", body: "Contracts, audits, mint details, shift times." },
  { tag: "TBA", title: "The mint.", body: "3,333 Valley Miners." },
  { tag: "180 DAYS", title: "Season 1.", body: "7B $VALLEY mined out." },
  { tag: "AFTER", title: "Season 2.", body: "New token, new systems.", tone: "sky" },
];

function RoadmapPage() {
  return (
    <Page n={12} head={["06 · WHAT'S NEXT", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <h2 className="hv-h">
          <Br a="WHERE THE" b="BUILD STANDS" />
        </h2>
        <ol className="m-0 grid list-none gap-2 p-0">
          {STAGES.map((s) => (
            <li key={s.tag} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
              <span
                className={cx(
                  "px-1.5 text-center font-mono text-[10.5px] tracking-[1px]",
                  s.tone === "now" ? "bg-night py-1 font-bold text-gold" : s.tone === "sky" ? "border-2 border-ink-blue py-0.5 text-ink-blue" : "border-2 border-night py-0.5",
                )}
              >
                {s.tag}
              </span>
              <span>
                <strong>{s.title}</strong> {s.body}
              </span>
            </li>
          ))}
        </ol>
        <p className="m-0 text-[13px] leading-normal text-umber-2">Until contracts are published, treat any address claiming to be Hood Valley as unofficial.</p>
      </div>
    </Page>
  );
}

function SeasonTwoPage() {
  return (
    <Page n={13} head={["06 · WHAT'S NEXT", "SEASON 2"]}>
      <div className={cx(darkCard, "justify-center gap-3.5 bg-seam p-[22px] text-cream shadow-[6px_6px_0_#1F6A88]")}>
        <svg aria-hidden viewBox="0 0 17 13" shapeRendering="crispEdges" className="block h-auto w-[min(200px,60%)] animate-glow self-center">
          <rect x="8" y="0" width="1" height="1" fill="#B9F1FF" />
          <rect x="7" y="1" width="3" height="1" fill="#6FD6F2" />
          <rect x="6" y="2" width="5" height="7" fill="#2F9BC4" />
          <rect x="7" y="2" width="2" height="7" fill="#6FD6F2" />
          <rect x="7" y="2" width="1" height="3" fill="#B9F1FF" />
          <rect x="2" y="3" width="2" height="1" fill="#6FD6F2" />
          <rect x="1" y="4" width="4" height="5" fill="#2F9BC4" />
          <rect x="2" y="4" width="1" height="5" fill="#6FD6F2" />
          <rect x="13" y="2" width="2" height="1" fill="#6FD6F2" />
          <rect x="12" y="3" width="4" height="6" fill="#2F9BC4" />
          <rect x="13" y="3" width="1" height="6" fill="#6FD6F2" />
          <rect x="0" y="9" width="17" height="1" fill="#3A2614" />
          <rect x="0" y="10" width="17" height="1" fill="#2A1C10" />
          <rect x="1" y="11" width="15" height="1" fill="#20150B" />
          <rect x="3" y="12" width="11" height="1" fill="#1A1208" />
        </svg>
        <h2 className="hv-h text-center" style={{ fontSize: 54, lineHeight: 0.9 }}>
          <Br a="SEASON 2:" b="THE FRONTIER EXPANDS" />
        </h2>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-[14.5px]">
          {["A new token for the Season 2 economy", "Crafting, terrain claims, syndicates", "Genesis Miners carry over"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span aria-hidden className="block size-2 flex-none bg-sky" />
              {t}
            </li>
          ))}
        </ul>
        <span className="self-center border-2 border-sky px-2.5 py-1.5 font-mono text-[10.5px] tracking-[1.5px] text-sky">OPENS AFTER SEASON 1 IS MINED OUT</span>
      </div>
    </Page>
  );
}

/** Page 15 · the visitor's own place in line, with the wallet they'll mint with. */
function JoinPage({ claim }: { claim: BookClaim | null }) {
  const router = useRouter();
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const no = claim?.memberNo ? String(claim.memberNo).padStart(4, "0") : null;

  async function link(e: React.FormEvent) {
    e.preventDefault();
    const address = wallet.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return setError("That doesn't look like a wallet address: 0x followed by 40 characters.");
    setBusy(true);
    setError("");
    const res = await api("/api/waitlist/wallet", { body: { address } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setWallet("");
    router.refresh();
  }

  function share() {
    const text = `I just filed my claim in Hood Valley ⛏️${no ? ` Prospector No. ${no} ·` : ""} 3,333 Valley Miners, one 12-hour shift a day on Robinhood Chain.`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer");
  }

  const input = "border-3 border-night bg-white p-[11px] font-mono text-[15px] tracking-normal text-night placeholder:text-faded";
  return (
    <Page n={14} head={["07 · JOIN", "HOOD VALLEY"]}>
      <div className="hv-body gap-3.5">
        <h2 className="hv-h">
          <Br a="CLAIM YOUR" b="SPOT" />
        </h2>
        {claim ? (
          <>
            <div role="status" className="border-3 border-night bg-night p-[18px] text-cream">
              <div className="font-pixel text-[38px] leading-none text-moss">YOU&apos;RE ON THE LIST</div>
              <p className="mb-0 mt-2 text-sm text-dust">
                {no ? `Prospector No. ${no}` : "Your claim is filed"}
                {claim.handle ? ` · @${claim.handle}` : ""}. We&apos;ll reach you on X and Discord when mint details are confirmed.
              </p>
            </div>
            {claim.wallet ? (
              <div className="flex flex-wrap items-center gap-3 border-3 border-night bg-paper-2 px-3 py-2.5">
                <span className="bg-night px-2 py-0.5 font-mono text-[10.5px] tracking-[1px] text-cream">WALLET</span>
                <span className="font-mono text-sm font-bold">{`${claim.wallet.slice(0, 6)}…${claim.wallet.slice(-4)}`}</span>
                <Link href="/waitlist" className="ml-auto font-mono text-[11px] tracking-[1px] text-ink-link hover:text-night">
                  CHANGE →
                </Link>
              </div>
            ) : (
              <form onSubmit={link} noValidate className="grid gap-2.5">
                <label className="grid gap-1 font-mono text-[10.5px] tracking-[1.5px] text-umber-2">
                  WALLET ON ROBINHOOD CHAIN (0x…)
                  <input
                    value={wallet}
                    onChange={(e) => {
                      setWallet(e.target.value);
                      setError("");
                    }}
                    placeholder="0x…"
                    autoComplete="off"
                    spellCheck={false}
                    className={input}
                  />
                </label>
                <button type="submit" disabled={busy} className={cx(nightBtn, "px-[18px] py-3 text-[28px] disabled:cursor-wait")}>
                  {busy ? "LINKING…" : "LINK MY WALLET"}
                </button>
              </form>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/waitlist" className={cx(monoBtn, "bg-paper hover:bg-paper-2 hover:text-night")}>
                OPEN MY PERMIT
              </Link>
              <button type="button" onClick={share} className={cx(monoBtn, "cursor-pointer bg-gold hover:bg-gold-hi")}>
                SHARE ON X ↗
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 max-w-[440px] text-base leading-normal text-umber-3">
              Mint dates and prices are announced before public release. Collect the stamps on a claim permit to get on the allowlist and hear first.
            </p>
            <Link href="/waitlist" className={cx(nightBtn, "block self-start px-[18px] py-3 text-[28px]")}>
              OPEN THE CLAIM OFFICE
            </Link>
          </>
        )}
        {error ? (
          <div role="alert" className="text-[13.5px] text-seal">
            {error}
          </div>
        ) : null}
        <p className="m-0 text-[12.5px] font-semibold text-umber-2">Hood Valley will never ask for your seed phrase or private key.</p>
      </div>
    </Page>
  );
}

/** Page 16 · the back page, glued to the right board. */
function BackPage({ links }: { links: BookLinks }) {
  const social = (label: string, url: string | null) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={cx(monoBtn, "bg-paper hover:bg-paper-2 hover:text-night")}>
        {label} ↗
      </a>
    ) : (
      <span className="border-3 border-dashed border-rule px-3 py-[9px] text-center font-mono text-xs tracking-[1px] text-umber">{label} · SOON</span>
    );
  return (
    <Page n={15} head={["THE LAST PAGE", "HOOD VALLEY"]}>
      <div className="hv-body gap-4">
        <div className={cx(framed, "aspect-video overflow-hidden bg-[#2D2409]")}>
          <PageVideo page={15} clip="miner-cave" label="A miner in a red helmet digging in a deep cave" />
        </div>
        <h2 className="hv-h" style={{ fontSize: 56, lineHeight: 0.9 }}>
          SEE YOU IN THE VALLEY
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/litepaper" className={cx(monoBtn, "bg-gold hover:bg-gold-hi hover:text-night")}>
            READ THE LITEPAPER
          </Link>
          <Link href="/play" className={cx(monoBtn, "bg-paper hover:bg-paper-2 hover:text-night")}>
            OPEN VALLEY HQ
          </Link>
          {social("X", links.x)}
          {social("DISCORD", links.discord)}
        </div>
        <p className="m-0 text-[12.5px] leading-normal text-umber-2">
          Hood Valley is an independent project built on Robinhood Chain, not affiliated with or endorsed by Robinhood Markets, Inc. Nothing here is financial advice or a
          promise of value. © 2026 Hood Valley
        </p>
      </div>
    </Page>
  );
}

/** The 16 pages in reading order. */
export function bookPages({ onJoin, claim, links }: { onJoin: () => void; claim: BookClaim | null; links: BookLinks }): React.ReactNode[] {
  return [
    <TitlePage key={0} onJoin={onJoin} />,
    <ValleyMapPage key={1} />,
    <CrewPage key={2} />,
    <GuidePage key={3} />,
    <MinersPage key={4} />,
    <LicensePage key={5} />,
    <ShiftPage key={6} />,
    <DialPage key={7} />,
    <SeasonPage key={8} />,
    <SeamPage key={9} />,
    <TokenPage key={10} />,
    <CorePage key={11} />,
    <RoadmapPage key={12} />,
    <SeasonTwoPage key={13} />,
    <JoinPage key={14} claim={claim} />,
    <BackPage key={15} links={links} />,
  ];
}
