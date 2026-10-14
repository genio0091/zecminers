"use client";

import { useState } from "react";
import { signOutAction } from "@/app/(game)/play/actions";
import { short } from "@/lib/client-api";
import { cx } from "../ui";
import { HqTopBar } from "./hq-header";
import { HqCard, fmtInt } from "./hq-ui";
import { RafflesTab } from "./tab-raffles";
import { SeasonTab } from "./tab-season";
import { ShiftTab } from "./tab-shift";
import { WalletTab } from "./tab-wallet";
import type { Tab } from "./types";
import { useGame } from "./use-game";

const TABS: [Tab, string][] = [
  ["shift", "SHIFT"],
  ["raffles", "RAFFLES"],
  ["season", "SEASON"],
  ["wallet", "WALLET"],
];

export function GameApp({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const game = useGame();
  const { me, loaded, loadError } = game;
  const [picked, setPicked] = useState<Tab | null>(null);
  // Players without a linked pass land on the Wallet tab, where they can link one.
  const tab: Tab = picked ?? (me && !me.pass ? "wallet" : "shift");
  const go = (t: Tab) => {
    setPicked(t);
    game.setNotice(null);
  };
  const address = me?.pass?.originAddress ?? me?.user.walletAddress ?? null;
  const chip = me?.pass?.isTest ? "TEAM TEST PASS · NOT PAID OUT" : "PRE-LAUNCH · SEASON 1";

  return (
    <div className="min-h-screen bg-bedrock text-[15px] leading-[1.55] text-cream">
      <HqTopBar
        chip={chip}
        admin={isAdmin}
        right={
          <>
            <span className="inline-flex items-baseline gap-2 border-2 border-clay px-2.5 py-[7px]">
              <span className="font-mono text-[10.5px] tracking-[1px] text-khaki">BALANCE</span>
              <span className="font-bold text-gold">{me ? `${fmtInt(me.balance)} $VALLEY` : "—"}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label={`Wallet ${address ?? userName}, select to disconnect`}
                title="Disconnect"
                className="cursor-pointer border-3 border-black bg-rock px-3 py-2 font-mono text-[12.5px] text-cream shadow-px-3 hover:bg-clay"
              >
                {address ? short(address, 6, 4) : userName}
              </button>
            </form>
          </>
        }
      >
        <nav aria-label="Valley HQ screens" className="mx-auto flex max-w-[1320px] flex-wrap gap-2 px-5 pb-2.5">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => go(key)}
              className={cx(
                "cursor-pointer border-3 border-black px-4 py-2 font-pixel text-2xl leading-none shadow-px-3",
                tab === key ? "bg-gold text-night" : "bg-rock text-cream hover:bg-clay",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </HqTopBar>

      <main className="mx-auto max-w-[1320px] px-5 pb-[72px] pt-6">
        {me?.maintenance ? (
          <HqCard className="mb-5 border-ember p-3.5 text-sm text-ember">
            Maintenance mode is on. Your balance is safe; shifts, claims and payouts are paused until the checks pass again.
          </HqCard>
        ) : null}
        {me?.user.status === "frozen" ? <HqCard className="mb-5 p-3.5 text-sm text-ember">This account is frozen. Contact the team on Discord.</HqCard> : null}
        {!loaded ? <HqCard className="text-dust">Clocking in…</HqCard> : null}
        {loaded && loadError && !me ? <HqCard className="text-ember">{loadError}</HqCard> : null}
        {me ? (
          <>
            {tab === "shift" && <ShiftTab game={game} go={go} />}
            {tab === "raffles" && <RafflesTab game={game} />}
            {tab === "season" && <SeasonTab game={game} />}
            {tab === "wallet" && <WalletTab game={game} />}
          </>
        ) : null}
      </main>
    </div>
  );
}
