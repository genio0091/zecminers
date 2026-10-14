"use client";

import { useState } from "react";
import { ALLOCATION } from "@/lib/content";
import { Kicker, PixelEdge, SectionTitle, Wrap } from "./strata";

const fmt = (v: number) => v.toLocaleString("en-US");
const COLS = "grid grid-cols-[minmax(0,1.6fr)_64px_minmax(0,1.2fr)] gap-3";

/** The vault: a fixed 10B supply. Hover or tab through the bar to see where each share goes. */
export function Tokenomics() {
  const [active, setActive] = useState(-1);
  const detail = ALLOCATION[active < 0 ? 0 : active]!;
  const clear = () => setActive(-1);
  return (
    <>
      <section id="token" aria-labelledby="token-title" className="bg-vault pb-[104px] pt-[88px]">
        <Wrap>
          <Kicker label="06 · $VALLEY tokenomics" depth="Depth −600 m · The vault" />
          <div className="mt-[18px] flex flex-wrap items-end justify-between gap-6">
            <SectionTitle id="token-title">
              10,000,000,000 $VALLEY.
              <br />
              FIXED SUPPLY.
            </SectionTitle>
            <p className="m-0 max-w-[420px] text-[17px] text-dust text-pretty">Every token has a job. Hover or tab through the bar to see where each share goes.</p>
          </div>

          <div className="mt-11" onMouseLeave={clear}>
            <div aria-hidden className="mb-2 flex gap-0.5 font-mono text-xs tracking-[1px] text-dust">
              <span className="min-w-0 flex-[70_1_0px]">70% · IN-GAME MINING</span>
              <span className="min-w-0 flex-[15_1_0px]">15% · LIQUIDITY</span>
              <span className="min-w-0 flex-[15_1_0px]" />
            </div>
            <div className="flex h-16 gap-0.5">
              {ALLOCATION.map((a, i) => (
                <button
                  key={a.code}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-label={`${a.name}: ${a.share}%, ${fmt(a.amount)} $VALLEY`}
                  className="h-full min-w-1.5 cursor-pointer border-0 p-0 transition-opacity duration-150"
                  style={{ flex: `${a.share} 1 0px`, background: a.color, opacity: active < 0 || active === i ? 1 : 0.35 }}
                />
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] items-start gap-6">
            <div className="overflow-x-auto border-3 border-black bg-night" onMouseLeave={clear}>
              <div className="min-w-[470px]">
                <div className={`${COLS} border-b-3 border-black px-4 py-3 font-mono text-[11px] tracking-[1.5px] text-khaki`}>
                  <span>ALLOCATION</span>
                  <span className="text-right">SHARE</span>
                  <span className="text-right">TOKENS</span>
                </div>
                {ALLOCATION.map((a, i) => (
                  <div
                    key={a.code}
                    onMouseEnter={() => setActive(i)}
                    className={`${COLS} items-center border-b-2 border-rock px-4 py-3.5`}
                    style={{ background: active === i ? "#2A1C10" : "transparent" }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden className="block size-3.5 flex-none" style={{ background: a.color }} />
                      <span className="text-cream">{a.name}</span>
                    </span>
                    <span className="text-right text-cream tabular">{a.share}%</span>
                    <span className="text-right text-cream tabular">{fmt(a.amount)}</span>
                  </div>
                ))}
                <div className={`${COLS} px-4 py-3.5 font-bold`}>
                  <span className="text-cream">Total · fixed supply</span>
                  <span className="text-right text-cream tabular">100%</span>
                  <span className="text-right text-cream tabular">10,000,000,000</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 border-3 border-black bg-rock p-[26px] shadow-[10px_10px_0_#0F0B07]" aria-live="polite">
              <div className="flex items-center gap-3">
                <span aria-hidden className="block size-[22px] flex-none" style={{ background: detail.color }} />
                <span className="font-mono text-xs tracking-[2px] text-dust">{detail.name.toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-4">
                <span className="text-[clamp(48px,5vw,64px)] font-extrabold leading-none text-cream">{detail.share}%</span>
                <span className="text-[22px] font-semibold text-gold">{fmt(detail.amount)} $VALLEY</span>
              </div>
              <p className="m-0 text-[17px] leading-[1.55] text-cream text-pretty">{detail.purpose}</p>
            </div>
          </div>
        </Wrap>
      </section>
      <PixelEdge from="#1E150B" to="#150F08" />
    </>
  );
}
