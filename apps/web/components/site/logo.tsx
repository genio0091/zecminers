import { cx } from "../ui";

/** The Hood Valley pixel mark: a pickaxe over the valley floor (12 × 12 grid). */
export function PixelMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden className={cx("flex-none", className)}>
      <rect x="0" y="0" width="12" height="12" fill="#F2B949" />
      <rect x="1" y="2" width="2" height="1" fill="#1A1208" />
      <rect x="9" y="2" width="2" height="1" fill="#1A1208" />
      <rect x="2" y="3" width="2" height="1" fill="#1A1208" />
      <rect x="8" y="3" width="2" height="1" fill="#1A1208" />
      <rect x="3" y="4" width="2" height="1" fill="#1A1208" />
      <rect x="7" y="4" width="2" height="1" fill="#1A1208" />
      <rect x="4" y="5" width="4" height="1" fill="#1A1208" />
      <rect x="5" y="6" width="2" height="1" fill="#1A1208" />
      <rect x="5" y="2" width="2" height="2" fill="#FFF4DA" />
      <rect x="1" y="8" width="10" height="1" fill="#1A1208" />
      <rect x="0" y="10" width="12" height="2" fill="#C98500" />
    </svg>
  );
}

/** Mark + wordmark. `text` lets Valley HQ say VALLEY HQ in the same lockup. */
export function Logo({ size = 36, text = "HOOD VALLEY", textClass = "text-[32px]", className }: { size?: number; text?: string; textClass?: string; className?: string }) {
  return (
    <span className={cx("flex items-center gap-3 text-cream", className)}>
      <PixelMark size={size} />
      <span className={cx("font-pixel leading-none tracking-[1px]", textClass)}>{text}</span>
    </span>
  );
}
