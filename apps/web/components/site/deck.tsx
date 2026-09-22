"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cx } from "../ui";

/**
 * The landing page as a deck of one-screen sheets. Visitors pick a section from the menu (the
 * rail on desktop, the sheet list on mobile), flip with Prev/Next, swipe on touch screens, or use
 * ← → keys. The URL hash tracks the sheet, so Back/Forward flip too and /#faq deep-links work.
 * Every sheet stays in the HTML, so crawlers and AI tools still read the whole page.
 */
export interface DeckSheet {
  id: string;
  label: string;
  /** Old anchor names that should open this sheet (e.g. "top", "token"). */
  aliases?: string[];
  content: ReactNode;
}

const SHEET_EVENT = "zm:sheet";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  window.addEventListener(SHEET_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
    window.removeEventListener(SHEET_EVENT, cb);
  };
}

const readHash = () => decodeURIComponent(window.location.hash.slice(1));

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

export function Deck({ sheets, railFoot }: { sheets: DeckSheet[]; railFoot?: ReactNode }) {
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const found = sheets.findIndex((s) => s.id === hash || s.aliases?.includes(hash));
  const index = found < 0 ? 0 : found;
  const [dir, setDir] = useState<1 | -1>(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (target: number) => {
      const n = Math.max(0, Math.min(sheets.length - 1, target));
      setMenuOpen(false);
      if (n === index) return;
      setDir(n > index ? 1 : -1);
      const url = n === 0 ? window.location.pathname + window.location.search : `#${sheets[n]!.id}`;
      window.history.pushState(null, "", url);
      window.dispatchEvent(new Event(SHEET_EVENT));
    },
    [index, sheets],
  );

  // New sheet starts at its top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const prev = index > 0 ? sheets[index - 1] : null;
  const next = index < sheets.length - 1 ? sheets[index + 1] : null;
  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* ---- desktop rail: every section is one click away ---- */}
      <nav aria-label="Sections" className="hidden w-[236px] flex-none flex-col border-r-3 border-black bg-coal-3 lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {sheets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? "page" : undefined}
              className={cx(
                "flex w-full cursor-pointer items-center gap-3 border-l-4 px-4 py-2 text-left text-[13px] uppercase tracking-[1px] transition-colors",
                i === index ? "border-gold bg-coal text-gold-hi" : "border-transparent text-dust hover:bg-coal hover:text-cream",
              )}
            >
              <span className={cx("font-pixel text-[15px]", i === index ? "text-gold" : "text-stone")}>{num(i)}</span>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
        {railFoot ? <div className="border-t-3 border-black p-4 text-[11px] leading-snug text-stone">{railFoot}</div> : null}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* progress */}
        <div className="flex flex-none gap-[3px] bg-black px-[3px] py-[3px]" aria-hidden>
          {sheets.map((s, i) => (
            <span key={s.id} className={cx("h-[5px] flex-1 transition-colors", i <= index ? "bg-gold" : "bg-coal")} />
          ))}
        </div>

        <div
          ref={scroller}
          className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          onTouchStart={(e) => {
            const t = e.touches[0];
            touch.current = t ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const start = touch.current;
            const t = e.changedTouches[0];
            touch.current = null;
            if (!start || !t || isTyping(e.target)) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
          }}
        >
          {sheets.map((s, i) => (
            <section
              key={s.id}
              aria-label={s.label}
              hidden={i !== index}
              className={cx("min-h-full", i === index && (dir > 0 ? "animate-sheet-next" : "animate-sheet-prev"))}
            >
              {s.content}
            </section>
          ))}
        </div>

        {/* ---- pager ---- */}
        <div className="flex flex-none items-stretch gap-2 border-t-3 border-black bg-ink px-2 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={!prev}
            aria-label={prev ? `Previous: ${prev.label}` : "Previous"}
            className="flex min-w-[52px] cursor-pointer items-center justify-center gap-2 border-3 border-black bg-coal px-3 font-pixel text-lg text-cream shadow-px-3 hover:bg-coal-hover disabled:cursor-default disabled:opacity-35 sm:justify-start"
          >
            <span aria-hidden>◂</span>
            <span className="hidden max-w-[180px] truncate text-[15px] sm:inline">{prev?.label ?? "Start"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="deck-menu"
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-3 border-black bg-coal px-3 py-1.5 shadow-px-3 hover:bg-coal-hover lg:cursor-default lg:bg-ink lg:shadow-none lg:hover:bg-ink"
          >
            <span className="font-pixel text-lg text-gold">
              {num(index)}
              <span className="text-stone">/{num(sheets.length - 1)}</span>
            </span>
            <span className="truncate text-[12px] uppercase tracking-[1px] text-cream">{sheets[index]!.label}</span>
            <span className="text-khaki lg:hidden" aria-hidden>
              {menuOpen ? "▴" : "▾"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={!next}
            aria-label={next ? `Next: ${next.label}` : "Next"}
            className="flex min-w-[52px] cursor-pointer items-center justify-center gap-2 border-3 border-black bg-gold px-3 font-pixel text-lg text-ink shadow-px-3 hover:bg-gold-hi disabled:cursor-default disabled:opacity-35 sm:justify-end"
          >
            <span className="hidden max-w-[180px] truncate text-[15px] sm:inline">{next?.label ?? "End"}</span>
            <span aria-hidden>▸</span>
          </button>
        </div>
      </div>

      {/* ---- mobile section menu ---- */}
      {menuOpen ? (
        <div id="deck-menu" className="absolute inset-0 z-50 flex flex-col bg-ink lg:hidden" role="dialog" aria-label="All sections">
          <div className="flex items-center justify-between border-b-3 border-black px-4 py-3">
            <span className="font-pixel text-xl">Jump to a section</span>
            <button type="button" onClick={() => setMenuOpen(false)} className="cursor-pointer border-3 border-black bg-coal px-3 py-1 font-pixel text-cream">
              Close
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
            {sheets.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={cx(
                  "flex cursor-pointer items-center gap-2 border-3 border-black px-3 py-3 text-left text-[12.5px] uppercase tracking-[0.5px] shadow-px-3",
                  i === index ? "bg-gold text-ink" : "bg-coal text-cream",
                )}
              >
                <span className={cx("font-pixel text-base", i === index ? "text-ink" : "text-gold")}>{num(i)}</span>
                <span className="leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
