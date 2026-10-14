import Link from "next/link";
import { Logo } from "./logo";

const X_URL = process.env.NEXT_PUBLIC_X_URL;
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL;

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "GAME",
    links: [
      { href: "/#lore", label: "The lore" },
      { href: "/#miners", label: "Valley Miners" },
      { href: "/#shift", label: "The daily shift" },
      { href: "/#season", label: "Season 1" },
    ],
  },
  {
    title: "TOKEN",
    links: [
      { href: "/#token", label: "$VALLEY tokenomics" },
      { href: "/#benefits", label: "Holder benefits" },
      { href: "/#season2", label: "Season 2" },
      { href: "/#roadmap", label: "Launch status" },
    ],
  },
  {
    title: "PROJECT",
    links: [
      { href: "/litepaper", label: "Litepaper" },
      { href: "/play", label: "Valley HQ" },
      { href: "/#allowlist", label: "Allowlist" },
      { href: "/raffles", label: "Raffle draws" },
      { href: "/proof-of-reserves", label: "Proof of reserves" },
    ],
  },
];

function Social({ label, url }: { label: string; url: string | undefined }) {
  if (!url) return <span className="text-khaki">{label} · coming soon</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-3 border-night bg-abyss pb-10 pt-14">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-8 px-6">
        <div>
          <Logo textClass="text-[30px]" />
          <p className="mt-3 mb-0 max-w-[280px] text-sm text-khaki">
            Mine the frontier. An on-chain mining game on Robinhood Chain, powered by 3,333 Valley Miners and $VALLEY.
          </p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title.toLowerCase()} className="grid content-start gap-2 text-[14.5px]">
            <div className="font-mono text-[11px] tracking-[2px] text-khaki">{c.title}</div>
            {c.links.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
            {c.title === "PROJECT" ? (
              <>
                <Social label="X" url={X_URL} />
                <Social label="Discord" url={DISCORD_URL} />
              </>
            ) : null}
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-9 grid max-w-[1280px] gap-2 border-t-2 border-night px-6 pt-5 text-[12.5px] leading-[1.6] text-fog">
        <p className="m-0">
          Hood Valley is an independent project built on Robinhood Chain. It is not affiliated with, endorsed by or sponsored by Robinhood Markets, Inc.
        </p>
        <p className="m-0">
          Nothing on this site is financial advice or a promise of value. Mint dates, prices, contract addresses, audit reports and shift snapshot times are TBA and
          are confirmed before public release.
        </p>
        <p className="m-0">© 2026 Hood Valley</p>
      </div>
    </footer>
  );
}
