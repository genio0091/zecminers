"use client";

import { HqCard, fmtInt } from "./hq-ui";
import type { Game } from "./use-game";

export function SeasonTab({ game }: { game: Game }) {
  const shift = game.shift;
  if (!shift) return null;
  const s = shift.season;
  const today = s.started ? s.day : 0;
  const held = shift.miners.filter((m) => m.status !== "stopped").length;
  return (
    <div className="grid gap-5">
      <HqCard aria-labelledby="season-h" className="p-[clamp(20px,3vw,28px)] shadow-px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs tracking-[2px] text-gold">SEASON 1 EMISSION</div>
            <h1 id="season-h" className="mt-1.5 mb-0 font-pixel text-[clamp(48px,5.4vw,76px)] font-normal leading-[.9]">
              {s.started ? `DAY ${s.day} OF ${s.days}` : s.start ? `OPENS ${s.start}` : "OPENS AT GENESIS"}
            </h1>
          </div>
          <div className="font-mono text-[11.5px] text-khaki">1 block = 1 day ≈ {(Number(s.dailyPool) / 1e6).toFixed(1)}M $VALLEY</div>
        </div>
        <div aria-hidden className="mt-5 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
          {Array.from({ length: s.days }, (_, i) => {
            const d = i + 1;
            return (
              <span
                key={d}
                title={`Day ${d}`}
                className="block aspect-square"
                style={{ background: d === today ? "#FFD77A" : d < today ? "#C98500" : "#3D2A16" }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-[18px] font-mono text-[11.5px] text-dust">
          {[
            ["#C98500", "Mined"],
            ["#FFD77A", "Today"],
            ["#3D2A16", "Still in the ground"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-2">
              <span aria-hidden className="block size-3" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
          {[
            ["SEASON 1 POOL", fmtInt(s.pool)],
            ["MINED BEFORE TODAY", fmtInt(s.minedBeforeToday)],
            ["LEFT IN THE POOL", s.funded ? fmtInt(s.poolLeft) : "Funded at genesis"],
            ["DAYS LEFT", s.started ? String(Math.max(0, s.days - s.day + 1)) : String(s.days)],
          ].map(([k, v]) => (
            <div key={k} className="border-3 border-black bg-bedrock p-3.5">
              <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">{k}</div>
              <div className="text-[22px] font-bold">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-3.5 mb-0 text-[12.5px] text-khaki">
          Season 1 ends when the 7,000,000,000 $VALLEY pool is fully mined out, planned at about {s.days} days. Days with no Miners on shift leave their pool in the
          ground, so the season runs a little longer.
        </p>
      </HqCard>

      <section
        aria-labelledby="s2-h"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 border-3 border-teal bg-teal-deep p-[clamp(20px,3vw,28px)] shadow-px-10"
      >
        <div>
          <div className="font-mono text-xs tracking-[2px] text-sky">AFTER THE MINE-OUT</div>
          <h2 id="s2-h" className="mt-1.5 mb-0 font-pixel text-[clamp(40px,4.4vw,60px)] font-normal leading-[.92]">
            SEASON 2 MIGRATION
          </h2>
          <p className="mt-3 mb-0 text-dust">
            When the final Season 1 block is mined and all 7 billion $VALLEY are in circulation, the mining phase for $VALLEY closes permanently and the frontier
            expands.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          <li className="border-2 border-teal px-3.5 py-3">
            <strong className="text-sky">New token launch.</strong> A new native token fuels the Season 2 economy.
          </li>
          <li className="border-2 border-teal px-3.5 py-3">
            <strong className="text-sky">Upgraded gameplay.</strong> Equipment crafting, expanded terrain claims and multi-miner syndicate operations.
          </li>
          <li className="border-2 border-teal px-3.5 py-3">
            <strong className="text-sky">Genesis continuity.</strong> Your {held} Valley {held === 1 ? "Miner stays a genesis asset" : "Miners stay genesis assets"} with
            access to Season 2 systems.
          </li>
        </ul>
      </section>
    </div>
  );
}
