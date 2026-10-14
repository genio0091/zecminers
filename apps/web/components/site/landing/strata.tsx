import type { ReactNode } from "react";
import { cx } from "../../ui";

/**
 * Each landing section is one layer of the valley, from the sunny surface down to bedrock.
 * The jagged 24 px edge between two layers is three stacked pixel rows.
 */
export function PixelEdge({ from, to }: { from: string; to: string }) {
  return (
    <div
      aria-hidden
      className="h-6"
      style={{
        backgroundColor: from,
        backgroundImage: `linear-gradient(90deg,${to} 0 36px,transparent 36px 48px),linear-gradient(90deg,transparent 0 8px,${to} 8px 28px,transparent 28px 56px,${to} 56px 76px,transparent 76px 96px),linear-gradient(90deg,transparent 0 12px,${to} 12px 20px,transparent 20px 192px)`,
        backgroundSize: "48px 8px,96px 8px,192px 8px",
        backgroundPosition: "0 16px,0 8px,0 0",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

/** "01 · The lore ── Depth −10 m · Valley floor" */
export function Kicker({ label, depth, color = "#F2B949" }: { label: string; depth?: string; color?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[2px]" style={{ color }}>
      <span aria-hidden className="block size-2.5" style={{ background: color }} />
      <span>{label}</span>
      {depth ? (
        <>
          <span aria-hidden className="block h-0.5 w-10 opacity-50" style={{ background: color }} />
          <span>{depth}</span>
        </>
      ) : null}
    </div>
  );
}

export function SectionTitle({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cx("m-0 font-pixel text-[clamp(54px,6.6vw,100px)] font-normal leading-[.88] tracking-[.5px] text-cream", className)}>
      {children}
    </h2>
  );
}

export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto max-w-[1280px] px-6", className)}>{children}</div>;
}

/** Pixel cloud for the surface sky. */
export function Cloud({ width, className, style }: { width: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden width={width} height={(width * 5) / 12} viewBox="0 0 12 5" shapeRendering="crispEdges" className={cx("absolute left-0", className)} style={style}>
      <rect x="3" y="0" width="3" height="1" fill="#FFE7A6" />
      <rect x="2" y="1" width="5" height="1" fill="#FFE7A6" />
      <rect x="8" y="1" width="2" height="1" fill="#FFE7A6" />
      <rect x="1" y="2" width="10" height="1" fill="#FFE7A6" />
      <rect x="0" y="3" width="12" height="2" fill="#FFE7A6" />
    </svg>
  );
}
