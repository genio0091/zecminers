"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass, cx } from "../ui";

/** Section links live in the landing deck itself; the header only links to other pages. */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/proof-of-reserves", label: "Proof of reserves" },
  { href: "/raffles", label: "Raffles" },
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
    <header className="sticky top-0 z-60 flex-none border-b-3 border-black bg-ink/95 shadow-[0_3px_0_rgba(240,168,30,.35)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="ZecMiners home" className="hover:text-cream">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-auto hidden gap-x-[18px] text-[13px] uppercase tracking-[1px] md:flex">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/play" className="text-moss">
            Play ▸
          </Link>
        </nav>
        {/* plain <a>: a hash change flips the landing deck to the waitlist sheet */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional, see above */}
        <a href="/#waitlist" className={buttonClass("gold", "sm", "ml-auto max-sm:hidden md:ml-0")}>
          Join waitlist
        </a>
        <Link href="/play" className={buttonClass("moss", "sm", "ml-auto sm:ml-0 md:hidden")}>
          Play
        </Link>
        <button
          type="button"
          className={buttonClass("dark", "sm", "md:hidden")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t-3 border-black bg-coal md:hidden">
          <div className="grid gap-1 px-4 py-3 text-sm uppercase tracking-[1px]">
            {[...NAV, { href: "/play", label: "Play ▸" }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b-3 border-ink py-2">
                {n.label}
              </Link>
            ))}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain anchor so the deck sees the hash change */}
            <a href="/#waitlist" onClick={() => setOpen(false)} className="py-2">
              Join waitlist
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
