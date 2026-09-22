"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCountdown } from "@zecminers/economy";
import { signOutAction } from "@/app/(game)/play/actions";
import { fmt, short } from "@/lib/client-api";
import { useClock } from "@/lib/use-clock";
import { Logo } from "../site/header";
import { Panel, cx } from "../ui";
import { LedgerTab } from "./tab-ledger";
import { MineTab } from "./tab-mine";
import { PassTab } from "./tab-pass";
import { PayoutsTab } from "./tab-payouts";
import { ProofTab } from "./tab-proof";
import { RaffleTab } from "./tab-raffle";
import type { Tab } from "./types";
import { useGame } from "./use-game";

const TABS: [Tab, string][] = [
  ["mine", "Mine"],
  ["pass", "Pass"],
  ["payouts", "Payouts"],
  ["raffle", "Raffle"],
  ["ledger", "Ledger"],
  ["proof", "Proof of reserves"],
];

function HeaderStat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("border-3 border-black bg-coal px-3 py-1.5 shadow-px-3", className)}>
      <span className="text-[10px] tracking-[1.5px] text-khaki">{label}</span>
      <div className="leading-tight">{children}</div>
    </div>
  );
}

export function GameApp({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const game = useGame();
  const { me, loaded, loadError, offsetMs } = game;
  const [picked, setPicked] = useState<Tab | null>(null);
  // Players without a linked pass land on the Pass tab until they choose another one.
  const tab: Tab = picked ?? (me && !me.pass ? "pass" : "mine");
  const setTab = (t: Tab) => {
    setPicked(t);
    game.setNotice(null);
  };
  const now = useClock(offsetMs);

  return (
    <>
      <header className="sticky top-0 z-40 border-b-3 border-black bg-ink/95 shadow-[0_3px_0_rgba(240,168,30,.3)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="hover:text-cream">
              <Logo size="sm" />
            </Link>
            <Link href="/" className="text-xs tracking-[1px] text-khaki">
              ◂ site
            </Link>
            <Link href="/docs" className="text-xs tracking-[1px] text-khaki">
              docs
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="text-xs tracking-[1px] text-gold">
                admin
              </Link>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <HeaderStat label="IN-GAME">
              <span className="font-pixel text-xl text-gold-hi">{me ? `${fmt(me.balance)} $ZGEMS` : "—"}</span>
            </HeaderStat>
            <HeaderStat label="NEXT PAYOUT">
              <span className="font-pixel text-xl">
                {me && now ? formatCountdown(Date.parse(me.nextPayout.cutoffAt) - now) : "—"}
              </span>
            </HeaderStat>
            <HeaderStat label="WALLET" className="max-w-[190px]">
              <span className="block truncate text-[13px] text-moss">{short(me?.user.walletAddress, 8, 6)}</span>
            </HeaderStat>
            <form action={signOutAction}>
              <button type="submit" className="cursor-pointer text-xs tracking-[1px] text-khaki hover:text-cream" title={`Signed in as ${userName}`}>
                sign out
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Game" className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto px-4 pb-2.5 sm:px-5">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
              className={cx(
                "flex-none cursor-pointer border-3 border-black px-3.5 py-1.5 font-pixel text-lg shadow-px-3",
                tab === key ? "bg-gold text-ink" : "bg-coal text-cream hover:bg-coal-hover",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-7 sm:px-5">
        {me?.maintenance ? (
          <Panel tone="ink" depth={4} className="mb-5 p-3.5 text-[13px] text-ember">
            Maintenance mode is on. Your balance is safe; mining, spending and payouts are paused until the checks pass again.
          </Panel>
        ) : null}
        {me?.user.status === "frozen" ? (
          <Panel tone="ink" depth={4} className="mb-5 p-3.5 text-[13px] text-ember">
            This account is frozen. Contact the team on Discord.
          </Panel>
        ) : null}
        {!loaded ? <Panel className="p-6 text-dust">Loading your mine…</Panel> : null}
        {loaded && loadError && !me ? <Panel className="p-6 text-ember">{loadError}</Panel> : null}
        {me ? (
          <>
            {tab === "mine" && <MineTab game={game} onGoPass={() => setTab("pass")} />}
            {tab === "pass" && <PassTab game={game} />}
            {tab === "payouts" && <PayoutsTab game={game} />}
            {tab === "raffle" && <RaffleTab game={game} />}
            {tab === "ledger" && <LedgerTab />}
            {tab === "proof" && <ProofTab />}
          </>
        ) : null}
      </main>
    </>
  );
}
