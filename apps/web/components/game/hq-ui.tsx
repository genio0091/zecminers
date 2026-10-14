"use client";

import type { ReactNode } from "react";
import type { Clip } from "@/lib/media";
import { LazyVideo } from "../lazy-video";
import { cx } from "../ui";
import type { Miner } from "./types";

/** Valley HQ panels: black frame, hard 8 px shadow. */
export function HqCard({ children, className, as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cx("border-3 border-black bg-card p-5 shadow-px-8", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("font-mono text-[11px] tracking-[2px] text-khaki", className)}>{children}</div>;
}

const ACTION = {
  gold: "bg-gold text-night",
  moss: "bg-moss text-night",
  sky: "bg-sky text-night",
} as const;

/** DEPLOY / CLAIM / GEAR UP: lit when there is something to do, dark otherwise. */
export function ActionButton({
  tone,
  live,
  children,
  className,
  ...rest
}: { tone: keyof typeof ACTION; live: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "cursor-pointer border-3 border-black px-3.5 py-[9px] font-pixel text-2xl leading-none shadow-px-4 transition-transform duration-75 active:translate-x-0.5 active:translate-y-0.5 active:shadow-px-2",
        live ? ACTION[tone] : "bg-rock text-stone",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className, ...rest }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx("cursor-pointer border-3 border-black bg-rock px-3 py-2.5 font-mono text-xs tracking-[1px] text-cream hover:bg-clay disabled:opacity-60", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

const MEDIA: Record<Miner["kind"], { clip: Clip; bg: string; className?: string }> = {
  surface: { clip: "miner-sun", bg: "#F5C01C" },
  cave: { clip: "miner-cave", bg: "#2D2409" },
  valley: { clip: "valley-map", bg: "#2B6B4E", className: "scale-[2.4] origin-[47%_62%]" },
};

/** The clip that matches a Miner's background trait. */
export function MinerMedia({ kind, className }: { kind: Miner["kind"]; className?: string }) {
  const m = MEDIA[kind];
  return (
    <div className={cx("relative overflow-hidden", className)} style={{ background: m.bg }}>
      <LazyVideo clip={m.clip} eager label="" className={cx("h-full", m.className)} />
    </div>
  );
}

// ------------------------------------------------------------------ formatting

export const fmtInt = (v: number | bigint | string) => {
  const s = typeof v === "number" ? Math.round(v).toString() : v.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/** 07:03:12 */
export function hms(ms: number): string {
  let s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/** 22:10 (UTC) */
export function utcTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

/** "Oct 14" */
export function utcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
