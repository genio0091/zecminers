import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../site/logo";

/** The Valley HQ top bar, shared by the sign-in screen and the game. */
export function HqTopBar({ chip, admin = false, right, children }: { chip: string; admin?: boolean; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b-3 border-black bg-night max-[720px]:static">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3.5 px-5 py-2.5">
        <Link href="/" aria-label="Hood Valley website" className="text-cream hover:text-cream">
          <Logo size={32} text="VALLEY HQ" textClass="text-[30px]" className="gap-2.5" />
        </Link>
        <span className="border-2 border-sky px-2 py-[3px] font-mono text-[10.5px] tracking-[1.5px] text-sky">{chip}</span>
        <nav aria-label="Site" className="flex gap-4 font-mono text-xs uppercase tracking-[1.5px]">
          <Link href="/">Website</Link>
          <Link href="/litepaper">Litepaper</Link>
          {admin ? (
            <Link href="/admin" className="text-sky">
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 border-2 border-clay px-2.5 py-2 font-mono text-[11.5px] tracking-[1px] text-dust">
            <span aria-hidden className="block size-2 bg-moss" />
            ROBINHOOD CHAIN
          </span>
          {right}
        </div>
      </div>
      {children}
    </header>
  );
}
