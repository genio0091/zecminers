import Link from "next/link";
import { Logo } from "./logo";

/** Chapter links open the Field Journal at that chapter. */
const SECTIONS = [
  { href: "/#crew", label: "Crew" },
  { href: "/#miners", label: "Miners" },
  { href: "/#shift", label: "Daily shift" },
  { href: "/#season", label: "Season 1" },
  { href: "/#valley", label: "$VALLEY" },
  { href: "/#ahead", label: "Roadmap" },
];

const secondary =
  "block border-2 border-umber px-3.5 py-[11px] font-mono text-xs uppercase tracking-[1.5px] text-cream hover:border-gold hover:text-gold max-[640px]:hidden";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-60 border-b-3 border-black bg-night">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-5 px-6 py-3">
        <Link href="/" aria-label="Hood Valley website" className="text-cream hover:text-cream">
          <Logo textClass="text-[32px] max-[640px]:text-[26px]" />
        </Link>
        <nav aria-label="Page sections" className="ml-3 flex gap-[22px] font-mono text-xs uppercase tracking-[1.5px] max-[1060px]:hidden">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}>
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Link href="/litepaper" className={secondary}>
            Litepaper
          </Link>
          <Link href="/play" className={secondary}>
            Valley HQ
          </Link>
          <Link
            href="/#join"
            className="block border-3 border-black bg-gold px-4 py-[9px] font-pixel text-2xl leading-none text-night shadow-px-4 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gold-hi hover:text-night hover:shadow-px-6 max-[640px]:px-3 max-[640px]:py-2 max-[640px]:text-xl"
          >
            JOIN ALLOWLIST
          </Link>
        </div>
      </div>
    </header>
  );
}
