"use client";

import { formatCountdown } from "@zecminers/economy";
import { useEffect, useState } from "react";
import { api, fmt, short } from "@/lib/client-api";
import { TRADING_LINE } from "@/lib/content";
import { LazyVideo } from "../lazy-video";
import { FinePrint, Label, Panel, Stat } from "../ui";
import type { PayoutRow } from "./types";
import type { useGame } from "./use-game";

const STATUS: Record<string, [string, string]> = {
  pending: ["QUEUED", "text-khaki"],
  approved: ["APPROVED", "text-gold-hi"],
  signing: ["SIGNING", "text-gold-hi"],
  inscribed: ["INSCRIBED · TX 1/2", "text-gold-hi"],
  sent: ["SENT · WAITING FOR FINALITY", "text-gold-hi"],
  settled: ["SETTLED", "text-moss"],
  failed: ["FAILED · RETRYING", "text-ember"],
  returned: ["RETURNED TO BALANCE", "text-khaki"],
};

export function PayoutsTab({ game }: { game: ReturnType<typeof useGame> }) {
  const { me, offsetMs } = game;
  const [rows, setRows] = useState<PayoutRow[] | null>(null);
  const [explorer, setExplorer] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    api<{ payouts: PayoutRow[]; explorerBaseUrl: string | null }>("/api/payouts").then((r) => {
      if (r.ok) {
        setRows(r.data.payouts);
        setExplorer(r.data.explorerBaseUrl);
      } else setRows([]);
    });
    const t = setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => clearInterval(t);
  }, [offsetMs]);
  if (!me) return null;

  const txLink = (txid: string | null) => {
    if (!txid) return "—";
    if (!explorer) return short(txid, 8, 6);
    return (
      <a href={`${explorer.replace(/\/$/, "")}/tx/${txid}`} target="_blank" rel="noreferrer">
        {short(txid, 8, 6)}
      </a>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <Stat size="lg" label="PAID OUT TO YOU" value={fmt(me.paidOutTotal)} />
        <Stat size="lg" label="QUEUED THIS WEEK" value={fmt(me.nextPayout.queued)} valueClass="text-cream" />
        <Stat size="lg" label="NEXT CUTOFF" value={formatCountdown(Date.parse(me.nextPayout.cutoffAt) - now)} valueClass="text-cream" />
        <Stat size="lg" label="FEES PAID BY YOU" value="0 ZEC" valueClass="text-moss" />
      </div>
      <Panel className="mt-5 overflow-hidden">
        <div className="border-b-3 border-black px-[18px] py-3.5 font-pixel text-2xl">Payout history</div>
        {rows === null ? <div className="px-[18px] py-4 text-dust">Loading…</div> : null}
        {rows && rows.length === 0 ? (
          <div className="px-[18px] py-4 text-dust">No payouts yet. Your first one comes at the next cutoff once your balance is above the minimum.</div>
        ) : null}
        {rows?.map((r) => {
          const [label, color] = STATUS[r.status] ?? [r.status.toUpperCase(), "text-dust"];
          return (
            <div key={`${r.week}-${r.status}`} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-center gap-3 border-b-3 border-ink px-[18px] py-3.5">
              <div>
                <Label>WEEK</Label>
                <div>{r.week}</div>
              </div>
              <div>
                <Label>AMOUNT</Label>
                <div className="font-pixel text-[19px] text-gold-hi">{fmt(r.amount)}</div>
              </div>
              <div>
                <Label>SEND TXID</Label>
                <div className="truncate text-[12.5px]">{txLink(r.sendTxid)}</div>
              </div>
              <div>
                <Label>STATUS</Label>
                <div className={color}>{label}</div>
              </div>
            </div>
          );
        })}
        <FinePrint className="px-[18px] py-3.5">
          Two transactions per payout: the transfer inscription, then the coin that carries it. The second txid is the one that moves your balance.
        </FinePrint>
      </Panel>
      <Panel className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <div className="flex border-b-3 border-black bg-gold md:border-b-0 md:border-r-3">
          <LazyVideo clip="uses" label="What $ZGEMS is for" />
        </div>
        <div className="p-5">
          <div className="mb-2 font-pixel text-2xl">After the payout</div>
          <p className="mb-2.5 mt-0 text-[13px] text-dust">
            Paid-out $ZGEMS sits in your wallet. It cannot be spent in the game again, and there is no deposit route back at launch.
          </p>
          <p className="m-0 text-[13px] text-dust">
            {TRADING_LINE} Until then there is no official price, only person-to-person listings on ZRC-20 marketplaces.
          </p>
        </div>
      </Panel>
    </div>
  );
}
