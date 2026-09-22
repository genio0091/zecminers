"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, fmt, newIdempotencyKey, short } from "@/lib/client-api";
import { Turnstile, turnstileEnabled } from "../turnstile";
import { Button, FinePrint, Label, Panel, Well, cx } from "../ui";
import type { RafflesResponse } from "./types";
import type { useGame } from "./use-game";

export function RaffleTab({ game }: { game: ReturnType<typeof useGame> }) {
  const [data, setData] = useState<RafflesResponse | null>(null);
  const [count, setCount] = useState(1);
  const [token, setToken] = useState("");
  const load = useCallback(() => api<RafflesResponse>("/api/raffles").then((r) => r.ok && setData(r.data)), []);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Panel className="p-6 text-dust">Loading raffles…</Panel>;
  const open = data.raffles.find((r) => r.status === "open");
  const past = data.raffles.filter((r) => r !== open);
  const mineFor = (id: number) => data.mine.filter((m) => m.raffleId === id);

  const buy = async () => {
    if (!open) return;
    if (turnstileEnabled && !token) return game.setNotice({ kind: "bad", text: "Complete the human check first." });
    await game.act(
      "tickets",
      () => api<{ count: number; cost: string }>(`/api/raffles/${open.id}/tickets`, { body: { count, turnstileToken: token }, idempotencyKey: newIdempotencyKey("tix") }),
      (d) => `Bought ${d.count} golden ticket(s) for ${fmt(d.cost)} $ZGEMS.`,
    );
    load();
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-5">
      <Panel className="p-5">
        <Label className="tracking-[2px]">THIS WEEK&apos;S DRAW</Label>
        {open ? (
          <div className="grid gap-3">
            <div className="font-pixel text-[28px]">{open.title}</div>
            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
              <Well className="p-3">
                <Label>PRIZE</Label>
                <div className="font-pixel text-xl text-gold-hi">{fmt(open.prizeAmount)}</div>
              </Well>
              <Well className="p-3">
                <Label>TICKET</Label>
                <div className="font-pixel text-xl">{fmt(open.ticketPrice)}</div>
              </Well>
              <Well className="p-3">
                <Label>TICKETS SOLD</Label>
                <div className="font-pixel text-xl">{fmt(open.totalTickets)}</div>
              </Well>
              <Well className="p-3">
                <Label>CLOSES AT BLOCK</Label>
                <div className="font-pixel text-xl">{fmt(open.closeBlockHeight)}</div>
                <div className="text-[11px] text-stone">tip {data.tipHeight !== null ? fmt(data.tipHeight) : "—"}</div>
              </Well>
            </div>
            <Well className="p-3 text-[12px]">
              <Label>SEED COMMITMENT · sha256(seed)</Label>
              <div className="break-all">{open.seedHash}</div>
            </Well>
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="grid gap-1 text-[11px] tracking-[1.5px] text-khaki">
                TICKETS
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-24 border-3 border-black bg-ink px-3 py-2 text-cream"
                />
              </label>
              <Button onClick={buy} disabled={game.busy !== null}>
                Buy · {fmt((BigInt(open.ticketPrice) * BigInt(count)).toString())}
              </Button>
            </div>
            <Turnstile onToken={setToken} />
            {mineFor(open.id).length ? (
              <div className="text-[13px] text-moss">
                Your tickets:{" "}
                {mineFor(open.id)
                  .map((m) => (m.count === 1 ? `#${m.startIndex}` : `#${m.startIndex}–#${m.startIndex + m.count - 1}`))
                  .join(", ")}
              </div>
            ) : null}
            <FinePrint>
              Tickets are paid from your in-game balance and leave circulation. Winners = HMAC-SHA256(seed, hash of block {fmt(open.closeBlockHeight)} + raffle id) mod
              tickets sold.
            </FinePrint>
          </div>
        ) : (
          <p className="text-dust">No raffle is open right now. The next one is announced in Discord.</p>
        )}
      </Panel>
      <Panel tone="coal-2" className="p-5">
        <div className="mb-3 font-pixel text-2xl">Past draws</div>
        <div className="grid gap-2.5">
          {past.length === 0 ? <p className="m-0 text-[13px] text-dust">None yet.</p> : null}
          {past.map((r) => (
            <Well key={r.id} className="grid gap-1 p-3 text-[13px]">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-pixel text-lg">
                  #{r.id} {r.title}
                </span>
                <span className={cx(r.status === "drawn" ? "text-gold-hi" : "text-khaki")}>{r.status.toUpperCase()}</span>
              </div>
              <div className="text-stone">
                {fmt(r.totalTickets)} tickets · seed {short(r.seed ?? r.seedHash, 8, 6)}
                {r.winners?.length ? ` · winning ticket #${r.winners.map((w) => w.index).join(", #")}` : ""}
              </div>
              <Link href={`/raffles/${r.id}`}>Verify ▸</Link>
            </Well>
          ))}
        </div>
      </Panel>
    </div>
  );
}
