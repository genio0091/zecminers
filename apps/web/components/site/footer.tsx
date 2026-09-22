import Link from "next/link";
import { TRADING_LINE } from "@/lib/content";
import { Logo } from "./header";

const COLS = [
  {
    title: "Game",
    links: [
      { href: "/#play", label: "How you play" },
      { href: "/#payouts", label: "Weekly payouts" },
      { href: "/#pass", label: "Whitelist Pass" },
      { href: "/play", label: "Play" },
      { href: "/#waitlist", label: "Join the waitlist" },
    ],
  },
  {
    title: "Token",
    links: [
      { href: "/#token", label: "$ZGEMS supply" },
      { href: "/proof-of-reserves", label: "Proof of reserves" },
      { href: "/raffles", label: "Raffle verification" },
      { href: "/docs", label: "Documentation" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Follow",
    links: [
      { href: process.env.NEXT_PUBLIC_X_URL ?? "/#waitlist", label: "X / Twitter" },
      { href: process.env.NEXT_PUBLIC_DISCORD_URL ?? "/#waitlist", label: "Discord" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-2 pb-10 pt-14">
      <div className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 px-4 sm:px-6">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-[280px] text-[13px] text-stone">
            A pixel mining game on Zcash. $ZGEMS is a ZRC-20 token, mined in the browser and paid out weekly.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="grid content-start gap-2 text-[13.5px]">
            <div className="text-[11px] uppercase tracking-[2px] text-khaki">{c.title}</div>
            {c.links.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 grid max-w-[1180px] gap-2 border-t-3 border-coal px-4 pt-5 text-xs text-stone sm:px-6">
        <p className="m-0">
          Keep your pass and your $ZGEMS in a ZRC-20 wallet such as Zatoshi Wallet. Wallets that select coins blindly, including ordinary Zcash wallets, can spend
          an inscription and destroy it permanently.
        </p>
        <p className="m-0">
          {TRADING_LINE} Nothing on this site is financial advice or a promise of value, and parameters marked as examples can change before launch.
        </p>
        <p className="m-0">ZecMiners is an independent project and is not affiliated with or endorsed by any Zcash development organization.</p>
      </div>
    </footer>
  );
}
