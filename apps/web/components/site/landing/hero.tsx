import Link from "next/link";
import { HERO_STATS, MARQUEE } from "@/lib/content";
import { LazyVideo } from "../../lazy-video";
import { Cloud, PixelEdge } from "./strata";

/** Surface: the hero, then the marquee strip. */
export function Hero() {
  return (
    <>
      <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden bg-surface text-night">
        <svg aria-hidden width="176" height="176" viewBox="0 0 9 9" shapeRendering="crispEdges" className="absolute right-[2.5%] top-[30px] opacity-90 max-[640px]:hidden">
          <rect x="3" y="0" width="3" height="1" fill="#FFD77A" />
          <rect x="1" y="1" width="7" height="2" fill="#FFD77A" />
          <rect x="0" y="3" width="9" height="3" fill="#FFD77A" />
          <rect x="1" y="6" width="7" height="2" fill="#FFD77A" />
          <rect x="3" y="8" width="3" height="1" fill="#FFD77A" />
        </svg>
        <Cloud width={192} className="top-11 animate-drift-slow" style={{ animationDelay: "-22s" }} />
        <Cloud width={132} className="top-[210px] animate-drift-slower opacity-80" style={{ animationDelay: "-70s" }} />

        <div className="relative mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(500px,100%),1fr))] items-center gap-14 px-6 pb-[88px] pt-[72px]">
          <div>
            <div className="inline-flex items-center gap-2.5 border-3 border-black bg-night px-3.5 py-2 font-mono text-xs uppercase tracking-[2px] text-gold">
              <span aria-hidden className="block size-2.5 animate-blink bg-moss" />
              <span>On-chain mining game · Robinhood Chain</span>
            </div>
            <h1
              id="hero-title"
              className="mt-[26px] mb-0 font-pixel text-[clamp(76px,10.5vw,158px)] font-normal leading-[.84] tracking-[1px] text-night [text-shadow:0_7px_0_rgba(26,18,8,.16)]"
            >
              MINE THE
              <br />
              FRONTIER
            </h1>
            <p className="mt-[26px] mb-0 max-w-[600px] text-[clamp(18px,1.55vw,21px)] leading-[1.5] text-umber-3 text-pretty">
              3,333 Valley Miners clock into one 12-hour shift a day and split a daily pool of <strong className="text-night">$VALLEY</strong>, extracted straight
              from the game&apos;s mining pool. Season 1 holds 7,000,000,000 $VALLEY. When it is mined out, $VALLEY mining closes for good.
            </p>
            <div className="mt-[34px] flex flex-wrap gap-3.5">
              <a
                href="#allowlist"
                className="block border-3 border-black bg-night px-[26px] py-[15px] font-pixel text-[30px] leading-none text-gold shadow-[6px_6px_0_#6B4A12] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-gold-hi hover:shadow-[8px_8px_0_#6B4A12]"
              >
                JOIN THE ALLOWLIST
              </a>
              <Link
                href="/litepaper"
                className="block border-3 border-night bg-cream px-[26px] py-[15px] font-pixel text-[30px] leading-none text-night shadow-[6px_6px_0_#1A1208] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white hover:text-night hover:shadow-[8px_8px_0_#1A1208]"
              >
                READ THE LITEPAPER
              </Link>
            </div>
            <p className="mt-[18px] mb-0 font-mono text-[12.5px] tracking-[.5px] text-umber-2">
              Mint date: TBA · Mint price: TBA · Contracts and audits published before public release
            </p>
            <div className="mt-9 grid max-w-[640px] grid-cols-[repeat(auto-fit,minmax(min(128px,100%),1fr))] gap-3">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="border-3 border-night bg-cream px-3.5 py-2.5 shadow-[4px_4px_0_#1A1208]">
                  <div className="font-pixel text-[40px] leading-none">{s.value}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[1px] text-umber-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full max-w-[580px] justify-self-center">
            <div className="relative aspect-square overflow-hidden border-6 border-night bg-valley-lit shadow-[16px_16px_0_#1A1208]">
              <LazyVideo
                clip="valley-map"
                eager
                label="Pixel-art gameplay preview: a miner works the valley floor beside a mine entrance and rail track"
                className="absolute inset-0 h-full"
              />
              <div className="absolute left-3.5 right-3.5 top-3.5 flex flex-wrap items-start justify-between gap-2">
                <div className="border-3 border-black bg-night px-2.5 py-1.5 font-mono text-[11px] tracking-[1.5px] text-cream">VALLEY MAP · SHIFT VIEW</div>
                <div className="border-3 border-black bg-gold px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[1.5px] text-night">IN DEVELOPMENT</div>
              </div>
              <div className="absolute bottom-3.5 left-3.5 right-3.5 grid gap-2 border-3 border-black bg-night px-3 py-2.5">
                <div className="flex justify-between gap-3 font-mono text-[11px] tracking-[1.5px] text-cream">
                  <span>SHIFT PROGRESS</span>
                  <span className="text-gold">12-HOUR WINDOW</span>
                </div>
                <div aria-hidden className="h-3.5 border-2 border-black bg-clay">
                  <div className="h-full animate-fill stripes-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <PixelEdge from="#F2B949" to="#1A1208" />
      </section>

      <div className="overflow-hidden bg-night pb-4 pt-3 text-gold">
        <div className="flex w-max animate-marquee font-pixel text-[34px] leading-none tracking-[1px]">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1 || undefined} className="flex items-center gap-[30px] pr-[30px]">
              {MARQUEE.map((m) => (
                <span key={m} className="contents">
                  <span>{m}</span>
                  <span aria-hidden className="text-sky">
                    ◆
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <PixelEdge from="#1A1208" to="#235A40" />
    </>
  );
}
