import { cx } from "../../ui";

/** The 7 × 6 pixel tick used on badges and stamps. */
export function PixelCheck({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 6) / 7} viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden fill="currentColor" className={cx("flex-none", className)}>
      <rect x="0" y="3" width="1" height="1" />
      <rect x="1" y="4" width="1" height="1" />
      <rect x="2" y="5" width="1" height="1" />
      <rect x="3" y="4" width="1" height="1" />
      <rect x="4" y="3" width="1" height="1" />
      <rect x="5" y="2" width="1" height="1" />
      <rect x="6" y="1" width="1" height="1" />
    </svg>
  );
}

/** VERIFIED = proven by a sign-in. MARKED = recorded from the visitor's click, reviewed before the allowlist is final. */
export function StampBadge({ verified, className }: { verified: boolean; className?: string }) {
  return (
    <span
      title={verified ? "Proven by sign-in." : "Recorded from your click. Reviewed before the allowlist is final."}
      className={cx(
        "inline-flex items-center gap-1.5 border-2 px-2.5 py-[5px] font-mono text-[11px] font-bold tracking-[1.5px]",
        verified ? "border-ok bg-ok-bg text-ok" : "border-shadow-gold bg-mark-bg text-shadow-gold",
        className,
      )}
    >
      <PixelCheck />
      {verified ? "VERIFIED" : "MARKED"}
    </span>
  );
}

export const monoLabel = "font-mono text-[10.5px] tracking-[1.5px] text-ink-soft";

/** "0413" — permits and prospector numbers use four digits. */
export const permitNo = (n: number | null) => (n ? String(n).padStart(4, "0") : "____");

export const shortWallet = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
