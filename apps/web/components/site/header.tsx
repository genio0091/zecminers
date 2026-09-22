"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass, cx } from "../ui";

const NAV = [
  { href: "/#play", label: "How you play" },
  { href: "/#payouts", label: "Payouts" },
  { href: "/#pass", label: "The pass" },
  { href: "/#token", label: "$ZGEMS" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
  { href: "/proof-of-reserves", label: "Proof" },
];

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-2.5 text-cream">
      <span className={cx("block border-3 border-black bg-gold shadow-px-3", size === "md" ? "size-[22px]" : "size-[18px]")} />
      <span className={cx("font-pixel font-bold tracking-[0.5px]", size === "md" ? "text-2xl" : "text-[22px]")}>ZecMiners</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-60 border-b-3 border-black bg-ink/95 shadow-[0_3px_0_rgba(240,168,30,.35)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center gap-5 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="ZecMiners home" className="hover:text-cream">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-auto hidden flex-wrap gap-x-[18px] gap-y-1 text-[13px] uppercase tracking-[1px] xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/play" className="text-moss">
            Play ▸
          </Link>
        </nav>
        <Link href="/#waitlist" className={buttonClass("gold", "sm", "ml-auto max-sm:hidden xl:ml-0")}>
          Join waitlist
        </Link>
        <button
          type="button"
          className={buttonClass("dark", "sm", "ml-auto xl:hidden sm:ml-0")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t-3 border-black bg-coal xl:hidden">
          <div className="mx-auto grid max-w-[1180px] gap-1 px-4 py-3 text-sm uppercase tracking-[1px] sm:px-6">
            {[...NAV, { href: "/play", label: "Play ▸" }, { href: "/#waitlist", label: "Join waitlist" }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b-3 border-ink py-2 last:border-0">
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
