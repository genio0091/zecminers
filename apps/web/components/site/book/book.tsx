"use client";

import "./book.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "../../ui";
import { PixelMark } from "../logo";
import { bookPages, PageView, type BookClaim, type BookLinks } from "./pages";

const CHAPTERS = ["COVER", "CREW", "MINERS", "SHIFT", "SEASON 1", "$VALLEY", "AHEAD", "JOIN"];
/** `/#join` opens the book at that chapter. */
const HASHES = ["cover", "crew", "miners", "shift", "season", "valley", "ahead", "join"];
const PAGES = 16;
const LAST_SPREAD = PAGES / 2 - 1;
const LEAVES = PAGES / 2 - 1;
/** The spread is drawn at this size and scaled to fit. */
const W = 1106;
const H = 700;

const NARROW = "(max-width: 860px)";
function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function Cloud({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 12 5" shapeRendering="crispEdges" className={cx("pointer-events-none absolute left-0", className)} style={style}>
      <rect x="3" y="0" width="3" height="1" fill="#FFE7A6" />
      <rect x="2" y="1" width="5" height="1" fill="#FFE7A6" />
      <rect x="8" y="1" width="2" height="1" fill="#FFE7A6" />
      <rect x="1" y="2" width="10" height="1" fill="#FFE7A6" />
      <rect x="0" y="3" width="12" height="2" fill="#FFE7A6" />
    </svg>
  );
}

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2B949" strokeWidth="3" strokeLinecap="square" aria-hidden>
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * The Field Journal: the public site as a book. Seven leaves turn around the spine (arrow keys,
 * a sideways drag, the page corners or the chapter tabs); below 860px it reads one page at a time.
 * Only the clips on the open pages play.
 */
export function Book({ claim, links }: { claim: BookClaim | null; links: BookLinks }) {
  const narrow = useNarrow();
  const [{ page, from, dir }, setTurn] = useState({ page: 0, from: 0, dir: "next" as "next" | "prev" });
  const [scale, setScale] = useState<number | null>(null);
  const main = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const spread = Math.floor(page / 2);
  const chapter = narrow ? Math.floor(page / 2) : spread;
  const visible = narrow ? [page] : [2 * spread, 2 * spread + 1];

  const turnTo = useCallback((to: number) => {
    setTurn((st) => (to === st.page ? st : { page: to, from: Math.floor(st.page / 2), dir: to > st.page ? "next" : "prev" }));
  }, []);
  const step = useCallback(
    (delta: 1 | -1) =>
      setTurn((st) => {
        const to = narrow ? clamp(st.page + delta, 0, PAGES - 1) : clamp(Math.floor(st.page / 2) + delta, 0, LAST_SPREAD) * 2;
        return to === st.page ? st : { page: to, from: Math.floor(st.page / 2), dir: delta > 0 ? "next" : "prev" };
      }),
    [narrow],
  );
  const goChapter = useCallback((k: number) => turnTo(clamp(k, 0, LAST_SPREAD) * 2), [turnTo]);

  // Fit the spread between the header and the page controls.
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const w = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 40;
      const h = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 34;
      const next = clamp(Math.min(w / W, h / H), 0.4, 1.2);
      setScale((cur) => (cur !== null && Math.abs(cur - next) < 0.004 ? cur : next));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Arrow keys / PageUp / PageDown turn pages; Home and End jump to the covers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
      else if (e.key === "Home") goChapter(0);
      else if (e.key === "End") goChapter(LAST_SPREAD);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, goChapter]);

  // `/#season` and friends open the book at that chapter, also when the hash changes later.
  useEffect(() => {
    const open = () => {
      const k = HASHES.indexOf(window.location.hash.slice(1));
      if (k >= 0) goChapter(k);
    };
    const raf = requestAnimationFrame(open);
    window.addEventListener("hashchange", open);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", open);
    };
  }, [goChapter]);

  const lo = Math.min(...visible) - 2;
  const hi = Math.max(...visible) + 2;
  const view = { visible, near: (p: number) => p >= lo && p <= hi };

  const pages = bookPages({ onJoin: () => goChapter(LAST_SPREAD), claim, links });
  const face = (i: number, className: string) => (
    <div key={i} className={cx("hv-face", className)} data-on={narrow ? page === i : visible.includes(i)} inert={!visible.includes(i)}>
      {pages[i]}
    </div>
  );

  const leaves = Array.from({ length: LEAVES }, (_, k) => {
    const turned = k < spread;
    let delay = 0;
    if (spread > from && k >= from && k < spread) delay = (k - from) * 0.09;
    if (spread < from && k >= spread && k < from) delay = (from - 1 - k) * 0.09;
    return (
      <div
        key={k}
        className="hv-leaf"
        style={{
          transform: turned ? "rotateY(-180deg)" : "rotateY(0deg)",
          zIndex: turned ? k + 1 : 20 - k,
          transition: `transform .9s cubic-bezier(.645,.045,.355,1) ${delay.toFixed(2)}s, z-index 0s linear ${(delay + 0.45).toFixed(2)}s`,
        }}
      >
        {face(2 * k + 1, "")}
        {face(2 * k + 2, "hv-face-back")}
      </div>
    );
  });

  const atStart = narrow ? page === 0 : spread === 0;
  const atEnd = narrow ? page === PAGES - 1 : spread === LAST_SPREAD;
  const label = narrow ? `${page + 1} / ${PAGES}` : `${2 * spread + 1}–${2 * spread + 2} / ${PAGES}`;
  const announce = `${narrow ? `Page ${page + 1}` : `Pages ${2 * spread + 1} and ${2 * spread + 2}`} of ${PAGES}. ${CHAPTERS[chapter]!.toLowerCase()}.`;
  const navBtn = "grid h-[46px] w-[52px] flex-none cursor-pointer place-items-center border-3 border-night bg-night disabled:cursor-default disabled:opacity-35";
  const edge = (n: number) => `${3 + n * 1.5}px`;

  return (
    <div className="hv-root">
      <svg aria-hidden className="hv-sun pointer-events-none absolute left-[1.5%] top-[84px] opacity-85" width="112" height="112" viewBox="0 0 9 9" shapeRendering="crispEdges">
        <rect x="3" y="0" width="3" height="1" fill="#FFD77A" />
        <rect x="1" y="1" width="7" height="2" fill="#FFD77A" />
        <rect x="0" y="3" width="9" height="3" fill="#FFD77A" />
        <rect x="1" y="6" width="7" height="2" fill="#FFD77A" />
        <rect x="3" y="8" width="3" height="1" fill="#FFD77A" />
      </svg>
      <Cloud className="top-[90px] h-20 w-48 animate-drift-slow" style={{ animationDelay: "-30s" }} />
      <Cloud className="bottom-[90px] h-[55px] w-[132px] animate-drift-slower opacity-80" style={{ animationDelay: "-80s" }} />

      <header className="hv-header">
        <button type="button" onClick={() => goChapter(0)} aria-label="Hood Valley, back to the cover" className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-night">
          <PixelMark size={34} tone="night" />
          <span className="hv-logo-text font-pixel text-[30px] leading-none tracking-[1px]">HOOD VALLEY</span>
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href="/litepaper" className="hv-nav-secondary block border-3 border-night px-[13px] py-[9px] font-mono text-xs tracking-[1.5px] text-night hover:bg-paper hover:text-night">
            LITEPAPER
          </Link>
          <Link href="/play" className="hv-nav-secondary block border-3 border-night px-[13px] py-[9px] font-mono text-xs tracking-[1.5px] text-night hover:bg-paper hover:text-night">
            VALLEY HQ
          </Link>
          <button
            type="button"
            onClick={() => goChapter(LAST_SPREAD)}
            className="hv-join cursor-pointer border-3 border-night bg-night px-4 py-[9px] font-pixel text-2xl leading-none text-gold shadow-[4px_4px_0_#6B4A12] hover:text-gold-hi"
          >
            {claim ? "MY PERMIT" : "JOIN ALLOWLIST"}
          </button>
        </div>
      </header>

      <main ref={main} className="hv-main">
        <div
          className="hv-wrap transition-opacity duration-300"
          style={{ transform: `scale(${(scale ?? 1).toFixed(3)})`, opacity: scale === null ? 0 : 1 }}
        >
          <div aria-hidden className="hv-cover" />
          <div aria-hidden className="hv-edge hv-edge-l" style={{ left: `-${edge(spread)}`, width: edge(spread) }} />
          <div aria-hidden className="hv-edge hv-edge-r" style={{ right: `-${edge(LAST_SPREAD - spread)}`, width: edge(LAST_SPREAD - spread) }} />

          <div
            className="hv-book"
            data-dir={dir}
            tabIndex={0}
            role="region"
            aria-roledescription="book"
            aria-label="Hood Valley field journal. Use the arrow keys, drag sideways, or the page corners to turn pages."
            onPointerDown={(e) => {
              const t = e.target as HTMLElement;
              swipe.current = t.closest("input,textarea,button,a,label,select") ? null : { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const s = swipe.current;
              swipe.current = null;
              if (!s) return;
              const dx = e.clientX - s.x;
              const dy = e.clientY - s.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              swipe.current = null;
            }}
          >
            <PageView.Provider value={view}>
              {face(0, "hv-face-fixed")}
              {face(PAGES - 1, "hv-face-fixed hv-face-right")}
              {leaves}
            </PageView.Provider>
            {spread > 0 ? <button type="button" className="hv-corner hv-corner-prev" onClick={() => step(-1)} aria-label="Turn back a page" /> : null}
            {spread < LAST_SPREAD ? <button type="button" className="hv-corner hv-corner-next" onClick={() => step(1)} aria-label="Turn to the next page" /> : null}
          </div>
        </div>
      </main>

      <nav aria-label="Turn pages" className="hv-bottom">
        <button type="button" onClick={() => step(-1)} disabled={atStart} aria-label="Previous page" className={navBtn}>
          <Arrow dir="prev" />
        </button>
        <div role="group" aria-label="Chapters" className="hv-chapters flex flex-wrap justify-center gap-1.5">
          {CHAPTERS.map((name, k) => (
            <button
              key={name}
              type="button"
              onClick={() => goChapter(k)}
              aria-current={k === chapter ? "page" : undefined}
              className={cx(
                "h-[46px] cursor-pointer border-3 border-night px-[11px] font-mono text-[11px] tracking-[1.5px]",
                k === chapter ? "bg-night text-gold" : "bg-paper text-night hover:bg-gold-pale",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="hv-pageno min-w-[110px] text-center font-mono text-[13px] font-bold tracking-[1.5px]">{label}</span>
        <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label="Next page" className={navBtn}>
          <Arrow dir="next" />
        </button>
      </nav>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
