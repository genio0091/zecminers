import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/** Tiny class joiner — no dependency needed. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type PanelTone = "coal" | "coal-2" | "ink" | "gold" | "dirt" | "amber";
const tone: Record<PanelTone, string> = {
  coal: "bg-coal",
  "coal-2": "bg-coal-2",
  ink: "bg-ink",
  gold: "bg-gold",
  dirt: "bg-dirt",
  amber: "bg-amber-deep",
};
const shadow = { 3: "shadow-px-3", 4: "shadow-px-4", 5: "shadow-px-5", 6: "shadow-px-6", 8: "shadow-px-8", 0: "" } as const;

export function Panel<T extends ElementType = "div">({
  as,
  tone: t = "coal",
  depth = 6,
  className,
  children,
  ...rest
}: { as?: T; tone?: PanelTone; depth?: keyof typeof shadow; className?: string; children?: ReactNode } & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "className" | "children"
>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cx("border-3 border-black", tone[t], shadow[depth], className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Inset well used inside panels. */
export function Well({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("border-3 border-black bg-ink", className)}>{children}</div>;
}

type Variant = "gold" | "dark" | "moss" | "ember" | "ghost";
const variants: Record<Variant, string> = {
  gold: "bg-gold text-ink hover:bg-gold-hi",
  dark: "bg-coal text-cream hover:bg-coal-hover",
  moss: "bg-moss text-ink hover:brightness-110",
  ember: "bg-coal text-ember hover:bg-coal-hover",
  ghost: "bg-coal text-dust hover:bg-coal-hover",
};
const sizes = {
  sm: "text-[17px] px-3 py-1.5 shadow-px-3",
  md: "text-[19px] px-4 py-2 shadow-px-4",
  lg: "text-[22px] px-6 py-3 shadow-px-6",
} as const;

export function buttonClass(variant: Variant = "gold", size: keyof typeof sizes = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap border-3 border-black font-pixel font-semibold leading-tight transition-[transform,box-shadow,filter] duration-75",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-px-2",
    "disabled:cursor-not-allowed disabled:bg-olive disabled:text-ink/80 disabled:active:translate-x-0 disabled:active:translate-y-0",
    "cursor-pointer select-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "gold",
  size = "md",
  className,
  type = "button",
  ...rest
}: ComponentPropsWithoutRef<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function Kicker({ children, color = "text-gold", className }: { children: ReactNode; color?: string; className?: string }) {
  return <div className={cx("text-xs uppercase tracking-[2.5px]", color, className)}>{children}</div>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("text-[10px] uppercase tracking-[1.5px] text-khaki", className)}>{children}</div>;
}

export function SectionTitle({
  kicker,
  kickerColor,
  title,
  children,
  as: Tag = "h2",
}: {
  kicker: string;
  kickerColor?: string;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div>
      <Kicker color={kickerColor}>{kicker}</Kicker>
      <Tag className="mt-2.5 font-pixel text-[clamp(32px,4.5vw,56px)] font-bold leading-[1.05] text-shadow-px">{title}</Tag>
      {children ? <div className="mt-4 max-w-[680px] text-dust">{children}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  valueClass = "text-gold-hi",
  className,
  size = "md",
}: {
  label: ReactNode;
  value: ReactNode;
  valueClass?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = { sm: "text-[19px]", md: "text-xl sm:text-2xl", lg: "text-[22px] sm:text-[26px]" }[size];
  return (
    <Panel depth={4} className={cx("px-3.5 py-3", className)}>
      <Label>{label}</Label>
      <div className={cx("font-pixel leading-tight [overflow-wrap:anywhere]", s, valueClass)}>{value}</div>
    </Panel>
  );
}

export function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-3 border-3 border-black bg-ink px-3 py-2.5", className)}>
      <span className="text-dust">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function Bar({ pct, color = "bg-gold", className }: { pct: number; color?: string; className?: string }) {
  return (
    <div className={cx("h-3.5 border-3 border-black bg-ink", className)}>
      <div className={cx("h-full", color)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-block border-3 border-black px-2.5 py-0.5 font-pixel text-[17px]", className)}>{children}</span>;
}

export function Dot({ color = "bg-gold", className }: { color?: string; className?: string }) {
  return <span className={cx("mt-[7px] block size-3 flex-none", color, className)} aria-hidden />;
}

export function FinePrint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("m-0 text-xs text-stone", className)}>{children}</p>;
}
