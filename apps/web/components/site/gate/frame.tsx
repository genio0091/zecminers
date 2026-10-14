import type { ReactNode } from "react";
import { cx } from "../../ui";
import { Cloud } from "../landing/strata";
import { PixelMark } from "../logo";

/** The sunny surface the gate pages sit on, with the logo lockup and the collection pill. */
export function GateFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-surface px-4 py-6 text-night sm:px-5 sm:py-10">
      <svg aria-hidden width="150" height="150" viewBox="0 0 9 9" shapeRendering="crispEdges" className="absolute right-[3%] top-6 opacity-90 max-[640px]:hidden">
        <rect x="3" y="0" width="3" height="1" fill="#FFD77A" />
        <rect x="1" y="1" width="7" height="2" fill="#FFD77A" />
        <rect x="0" y="3" width="9" height="3" fill="#FFD77A" />
        <rect x="1" y="6" width="7" height="2" fill="#FFD77A" />
        <rect x="3" y="8" width="3" height="1" fill="#FFD77A" />
      </svg>
      <Cloud width={176} className="top-16 animate-drift-slow" style={{ animationDelay: "-22s" }} />
      <Cloud width={120} className="top-[340px] animate-drift-slower opacity-80" style={{ animationDelay: "-70s" }} />

      <div className={cx("relative flex w-full flex-col items-center", wide ? "max-w-[720px]" : "max-w-[680px]")}>
        <header className="mb-4 flex flex-col items-center gap-2.5 sm:mb-6">
          <div className="flex items-center gap-3">
            <PixelMark size={46} className="shadow-[0_3px_0_#1A1208]" />
            <span className="font-pixel text-[30px] leading-none tracking-[1px] sm:text-[36px]">HOOD VALLEY</span>
          </div>
          <div className="inline-flex items-center gap-2 whitespace-nowrap border-3 border-black bg-night px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1px] text-gold sm:gap-2.5 sm:text-xs sm:tracking-[2px]">
            <span aria-hidden className="block size-2 animate-blink bg-moss" />
            3,333 Valley Miners · Robinhood Chain
          </div>
        </header>
        {children}
        <p className="mt-5 text-center font-mono text-xs tracking-[.5px] text-umber-2 sm:mt-7">3,333 Miners. One shift a day. Mine the frontier.</p>
      </div>
    </main>
  );
}
