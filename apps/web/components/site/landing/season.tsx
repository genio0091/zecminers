"use client";

import { useState } from "react";
import { NFT_MINERS_SUPPLY, SEASON_1 } from "@hoodvalley/economy";
import { Kicker, PixelEdge, SectionTitle, Wrap } from "./strata";

const POOL = Number(SEASON_1.pool);
const DAYS = SEASON_1.days;
const DAILY = POOL / DAYS;
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

const SEASON_STATS = [
  { label: "Season 1 mining pool", value: "7,000,000,000", note: "$VALLEY · 70% of total supply" },
  { label: "Emission duration", value: "180 days", note: "About 6 months" },
  { label: "Daily in-game allocation", value: "~38,888,889", note: "$VALLEY per day" },
];

/** The 180-day seam: one block per day, scrub or hover to see the planned schedule. */
function Seam() {
  const [day, setDay] = useState(45);
  const mined = Math.round((day * POOL) / DAYS);
  return (
    <div className="border-3 border-night bg-rock-2 p-6 shadow-[10px_10px_0_#120C06]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="m-0 font-pixel text-[34px] font-normal leading-none text-cream">THE 180-DAY SEAM</h3>
        <span className="font-mono text-[11.5px] text-khaki">1 block = 1 day ≈ 38.9M $VALLEY</span>
      </div>
      <div aria-hidden className="mt-[18px] grid gap-[3px]">
        {Array.from({ length: 6 }, (_, m) => (
          <div key={m} className="grid grid-cols-[30px_repeat(30,minmax(0,1fr))] items-center gap-[3px]">
            <span className="font-mono text-[10.5px] text-khaki">M{m + 1}</span>
            {Array.from({ length: 30 }, (_, k) => {
              const d = m * 30 + k + 1;
              return (
                <span
                  key={d}
                  title={`Day ${d} · ${fmt((d * POOL) / DAYS)} $VALLEY mined`}
                  onMouseEnter={() => setDay(d)}
                  className="block aspect-square cursor-crosshair"
                  style={{ background: d === day ? "#FFD77A" : d < day ? "#C98500" : "#3D2A16" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <label className="mt-5 grid gap-2 font-mono text-xs tracking-[1px] text-dust">
        <span>Scrub the schedule · day {day} of 180</span>
        <input
          type="range"
          min={0}
          max={DAYS}
          step={1}
          value={day}
          onChange={(e) => setDay(Math.max(0, Math.min(DAYS, Number.parseInt(e.target.value, 10) || 0)))}
          className="h-7 w-full accent-gold"
        />
      </label>
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-2.5" aria-live="polite">
        {[
          [`MINED BY DAY ${day}`, fmt(mined)],
          ["LEFT IN THE POOL", fmt(POOL - mined)],
          ["SEASON PROGRESS", `${((day / DAYS) * 100).toFixed(1)}%`],
        ].map(([k, v]) => (
          <div key={k} className="border-3 border-night bg-rock p-3">
            <div className="font-mono text-[10.5px] tracking-[1px] text-khaki">{k}</div>
            <div className="text-xl font-bold text-cream">{v}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 mb-0 text-[12.5px] text-khaki">Planned schedule at an even ~38,888,889 $VALLEY a day. The season ends when the 7B pool is fully mined out.</p>
    </div>
  );
}

/** How far does one day's pool stretch? An even split, for illustration only. */
function ShareEstimator() {
  const [deployed, setDeployed] = useState(NFT_MINERS_SUPPLY);
  const [mineRaw, setMine] = useState(1);
  const mine = Math.min(mineRaw, deployed);
  const perMiner = DAILY / deployed;
  const stepper = "h-[46px] w-[46px] cursor-pointer border-0 bg-cream font-pixel text-[30px] text-night hover:bg-gold-pale";
  return (
    <div className="border-3 border-night bg-gold p-6 text-night shadow-[10px_10px_0_#120C06]">
      <h3 className="m-0 font-pixel text-[34px] font-normal leading-none">SHARE ESTIMATOR</h3>
      <p className="mt-2 mb-0 text-[14.5px] text-umber-3">How far does one day&apos;s pool stretch? Move the sliders.</p>
      <label className="mt-[18px] grid gap-2 font-mono text-xs font-bold tracking-[1px]">
        <span>Miners working today&apos;s shift: {fmt(deployed)}</span>
        <input
          type="range"
          min={1}
          max={NFT_MINERS_SUPPLY}
          step={1}
          value={deployed}
          onChange={(e) => setDeployed(Math.max(1, Math.min(NFT_MINERS_SUPPLY, Number.parseInt(e.target.value, 10) || 1)))}
          className="h-7 w-full accent-night"
        />
      </label>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <span id="mine-label" className="font-mono text-xs font-bold tracking-[1px]">
          Miners you deploy
        </span>
        <div role="group" aria-labelledby="mine-label" className="flex items-center border-3 border-night bg-cream">
          <button type="button" aria-label="One fewer Miner" onClick={() => setMine((m) => Math.max(1, m - 1))} className={`${stepper} border-r-3 border-r-night`}>
            −
          </button>
          <span className="min-w-16 text-center text-[22px] font-bold" aria-live="polite">
            {mine}
          </span>
          <button
            type="button"
            aria-label="One more Miner"
            onClick={() => setMine((m) => Math.min(50, m + 1, deployed))}
            className={`${stepper} border-l-3 border-l-night`}
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-[18px] grid gap-2.5" aria-live="polite">
        {[
          ["PER MINER · PER DAY", fmt(perMiner)],
          ["YOUR MINERS · PER DAY", fmt(perMiner * mine)],
          ["SAME EVERY DAY · 180 DAYS", fmt(perMiner * mine * DAYS)],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-3 border-3 border-black bg-night px-4 py-3.5 text-cream">
            <span className="font-mono text-[11.5px] tracking-[1px] text-dust">{k}</span>
            <span className="text-2xl font-bold text-gold">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3.5 mb-0 text-[12.5px] leading-[1.5] text-umber-3">
        An even split for illustration only. Real shares depend on shift duration, trait mechanics and streak bonuses. Not a forecast of value.
      </p>
    </div>
  );
}

/** Rock: Season 1 emission. */
export function SeasonOne() {
  return (
    <>
      <section id="season" aria-labelledby="season-title" className="bg-rock pb-[104px] pt-[88px]">
        <Wrap>
          <Kicker label="04 · Season 1 emission" depth="Depth −300 m · Rock" />
          <SectionTitle id="season-title" className="mt-[18px] max-w-[1100px]">
            SEVEN BILLION $VALLEY. 180 DAYS. THEN THE SEAM CLOSES.
          </SectionTitle>
          <p className="mt-6 mb-0 max-w-[720px] text-[17px] text-dust text-pretty">
            Season 1 runs for about six months. It ends automatically once the full 70% in-game mining allocation is mined out. After that, the mining phase for
            $VALLEY closes permanently and the valley moves on to Season 2.
          </p>

          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
            {SEASON_STATS.map((s) => (
              <div key={s.label} className="border-3 border-night bg-rock-2 px-[22px] py-5 shadow-[6px_6px_0_#120C06]">
                <div className="font-mono text-[11.5px] uppercase tracking-[1.5px] text-khaki">{s.label}</div>
                <div className="mt-1.5 text-[clamp(30px,3vw,40px)] font-bold leading-[1.15] text-cream">{s.value}</div>
                <div className="text-sm text-dust">{s.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] items-start gap-6">
            <Seam />
            <ShareEstimator />
          </div>
        </Wrap>
      </section>
      <PixelEdge from="#2A1C10" to="#221709" />
    </>
  );
}
