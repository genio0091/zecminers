"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmt } from "@/lib/client-api";
import { Button, FinePrint, Panel, cx } from "../ui";
import type { LedgerRow } from "./types";

const KIND: Record<string, string> = {
  mining_collect: "Mining collect",
  daily_reward: "Daily reward",
  upgrade: "Pickaxe upgrade",
  repair: "Pickaxe repair",
  raffle_ticket: "Raffle tickets",
  raffle_prize: "Raffle prize",
  ore_exchange: "Ore exchange",
  marketing_grant: "Grant",
  payout_cutoff: "Moved to weekly payout",
  payout_returned: "Payout returned",
};

export function LedgerTab() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (c: number | null) => {
    setLoading(true);
    const r = await api<{ rows: LedgerRow[]; nextCursor: number | null }>(`/api/ledger?limit=25${c ? `&cursor=${c}` : ""}`);
    setLoading(false);
    if (!r.ok) return;
    setRows((prev) => (c ? [...prev, ...r.data.rows] : r.data.rows));
    setCursor(r.data.nextCursor);
    setDone(r.data.nextCursor === null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state updates after the request resolves
    load(null);
  }, [load]);

  return (
    <Panel className="overflow-hidden">
      <div className="border-b-3 border-black px-[18px] py-3.5 font-pixel text-2xl">Your ledger</div>
      {rows.length === 0 && !loading ? <div className="px-[18px] py-4 text-dust">Nothing yet. Start a session to earn your first $ZGEMS.</div> : null}
      <div>
        {rows.map((r) => {
          const n = BigInt(r.amount);
          return (
            <div key={r.entryId} className="grid grid-cols-[1fr_auto] gap-3 border-b-3 border-ink px-[18px] py-2.5 text-[13px] sm:grid-cols-[180px_1fr_auto]">
              <span className="text-khaki">{new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
              <span className="hidden sm:block">
                {KIND[r.kind] ?? r.kind}
                {r.memo ? <span className="text-stone"> · {r.memo}</span> : null}
              </span>
              <span className={cx("text-right font-pixel text-lg", n >= 0n ? "text-moss" : "text-ember")}>
                {n >= 0n ? "+" : ""}
                {fmt(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 px-[18px] py-3.5">
        <FinePrint>Every entry is immutable. Your balance is the sum of these lines.</FinePrint>
        {!done ? (
          <Button size="sm" variant="dark" disabled={loading} onClick={() => load(cursor)}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
