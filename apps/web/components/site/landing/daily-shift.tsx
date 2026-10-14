"use client";

import { useState } from "react";
import { SHIFT_STEPS } from "@/lib/content";
import { LazyVideo } from "../../lazy-video";
import { cx } from "../../ui";
import { Kicker, PixelEdge, SectionTitle, Wrap } from "./strata";

const DIAL_LABELS = [
  "24-hour shift dial. Deployment happens as the 12-hour mining window opens.",
  "24-hour shift dial. Extraction runs through the whole 12-hour mining window.",
  "24-hour shift dial. Claiming happens when the 12-hour mining window closes.",
  "24-hour shift dial. Maintenance happens off-shift, before the next window opens.",
];
const MARKER = ["rotate(0deg)", "rotate(0deg)", "rotate(180deg)", "rotate(270deg)"];

/** A 24-hour dial: the gold half is the mining window, the rest is off-shift. */
function ShiftDial({ step }: { step: number }) {
  const off = step === 3 ? "#6FD6F2" : "#4A3420";
  const window = step === 3 ? "#7A5A20" : "#F2B949";
  const marker = <rect x="92" y="16" width="16" height="16" fill="#FFF4DA" stroke="#1A1208" strokeWidth="3" />;
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={DIAL_LABELS[step]} className="block h-auto w-full">
      <circle cx="100" cy="100" r="95" fill="none" stroke="#5A4428" strokeWidth="5" strokeDasharray="1.6 23.27" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={off} strokeWidth="22" strokeDasharray="238.76 477.52" strokeDashoffset="-238.76" transform="rotate(-90 100 100)" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={window} strokeWidth="22" strokeDasharray="238.76 477.52" transform="rotate(-90 100 100)" />
      <text x="100" y="98" textAnchor="middle" fill="#FFF4DA" className="font-pixel text-[46px]">
        12 H
      </text>
      <text x="100" y="120" textAnchor="middle" fill="#D9C6A0" className="font-mono text-[9px] tracking-[1.5px]">
        MINING WINDOW
      </text>
      {step === 1 ? (
        <g className="animate-sweep" style={{ transformBox: "view-box", transformOrigin: "100px 100px" }}>
          {marker}
        </g>
      ) : (
        <g style={{ transformBox: "view-box", transformOrigin: "100px 100px", transform: MARKER[step] }}>{marker}</g>
      )}
    </svg>
  );
}

function StepMedia({ step }: { step: number }) {
  if (step === 2) {
    return (
      <div className="grid gap-3 border-3 border-night bg-gold p-5 text-night">
        <div className="flex flex-wrap justify-between gap-3 font-mono text-xs font-bold tracking-[1.5px]">
          <span>SHIFT COMPLETE · CLAIM OPEN</span>
          <span>ILLUSTRATION</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-2.5">
          <div className="border-3 border-night bg-cream p-3">
            <div className="font-mono text-[11px] tracking-[1px] text-umber-2">TODAY&apos;S POOL</div>
            <div className="text-2xl font-bold">~38,888,889</div>
          </div>
          <div className="border-3 border-night bg-cream p-3">
            <div className="font-mono text-[11px] tracking-[1px] text-umber-2">IF ALL 3,333 WORK EVENLY</div>
            <div className="text-2xl font-bold">≈ 11,668 each</div>
          </div>
        </div>
        <p className="m-0 text-[13.5px] text-umber-3">Real shares depend on shift duration and trait mechanics. The numbers above only divide the pool evenly.</p>
      </div>
    );
  }
  const media = [
    { clip: "valley-map", bg: "#2B6B4E", label: "Miner heading into the mine entrance" },
    { clip: "miner-cave", bg: "#2D2409", label: "Miner extracting ore in a deep cave" },
    null,
    { clip: "miner-sun", bg: "#F5C01C", label: "Miner geared up with hat and pack" },
  ] as const;
  const m = media[step]!;
  return (
    <div className="aspect-video overflow-hidden border-3 border-night" style={{ background: m.bg }}>
      <LazyVideo key={m.clip} clip={m.clip} eager label={m.label} className="h-full" />
    </div>
  );
}

/** Clay: one shift a day, four moves. Pick a move to see where it sits in the day. */
export function DailyShift() {
  const [step, setStep] = useState(0);
  const current = SHIFT_STEPS[step]!;
  return (
    <>
      <section id="shift" aria-labelledby="shift-title" className="bg-clay pb-[104px] pt-[88px]">
        <Wrap>
          <Kicker label="03 · The daily shift" depth="Depth −120 m · Clay" />
          <div className="mt-[18px] flex flex-wrap items-end justify-between gap-6">
            <SectionTitle id="shift-title">
              ONE SHIFT A DAY.
              <br />
              FOUR MOVES.
            </SectionTitle>
            <p className="m-0 max-w-[440px] text-[17px] text-dust text-pretty">
              Hood Valley gameplay runs entirely on-chain through structured mining windows. Pick a move to see where it sits in the day.
            </p>
          </div>

          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-7">
            <div className="grid gap-3" role="group" aria-label="Daily mining loop steps">
              {SHIFT_STEPS.map((s, i) => {
                const on = step === i;
                return (
                  <button
                    key={s.n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStep(i)}
                    className={cx(
                      "grid w-full cursor-pointer grid-cols-[64px_1fr] items-center gap-4 border-3 border-night px-[18px] py-4 text-left font-sans transition-transform duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5",
                      on ? "bg-gold text-night shadow-[6px_6px_0_#1A1208]" : "bg-clay-2 text-cream shadow-[4px_4px_0_#1A1208]",
                    )}
                  >
                    <span className="font-pixel text-[52px] leading-[.9]">{s.n}</span>
                    <span className="grid gap-0.5">
                      <span className="font-pixel text-[30px] leading-none tracking-[.5px]">{s.title}</span>
                      <span className="text-[14.5px] opacity-90">{s.short}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-[22px] border-3 border-night bg-clay-2 p-6 shadow-[10px_10px_0_#1A1208]">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-center gap-[22px]">
                <div className="relative w-full max-w-[260px] justify-self-center">
                  <ShiftDial step={step} />
                </div>
                <div className="grid gap-2.5 font-mono text-xs tracking-[1px]">
                  <div className="flex items-center gap-2.5 text-cream">
                    <span aria-hidden className="block size-3.5 flex-none bg-gold" />
                    Mining window · 12 h
                  </div>
                  <div className="flex items-center gap-2.5 text-cream">
                    <span aria-hidden className="block size-3.5 flex-none bg-sky" />
                    Off-shift · prep for tomorrow
                  </div>
                  <div className="flex items-center gap-2.5 text-cream">
                    <span aria-hidden className="box-border block size-3.5 flex-none border-3 border-night bg-cream" />
                    Where this move happens
                  </div>
                  <p className="mt-1.5 mb-0 text-[11.5px] leading-[1.5] tracking-[.5px] text-khaki">Exact shift and snapshot times are confirmed before launch.</p>
                </div>
              </div>
              <div>
                <div className="font-mono text-xs tracking-[2px] text-gold">
                  STEP {current.n} · {current.upper}
                </div>
                <p className="mt-2 mb-0 text-[clamp(19px,1.6vw,22px)] leading-[1.5] text-cream text-pretty">{current.body}</p>
              </div>
              <StepMedia step={step} />
            </div>
          </div>
        </Wrap>
      </section>
      <PixelEdge from="#3A2614" to="#2A1C10" />
    </>
  );
}
