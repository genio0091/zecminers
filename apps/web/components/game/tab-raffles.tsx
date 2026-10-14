"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, newIdempotencyKey, short } from "@/lib/client-api";
import { Turnstile, turnstileEnabled } from "../turnstile";
import { cx } from "../ui";
import { ActionButton, HqCard, MonoLabel, fmtInt } from "./hq-ui";
import type { RafflesResponse } from "./types";
import type { Game } from "./use-game";

const KINDS = [
  { kicker: "DAILY", title: "HOLDER REWARDS", body: "Regular holder lotteries funded by the community allocation.", foot: ["NEXT DRAW", "SNAPSHOT TIME TBA"] },
  { kicker: "ITEMS", title: "ITEM RAFFLES", body: "In-game items for Valley Miner holders. Item list confirmed before launch.", foot: ["NEXT DRAW", "SNAPSHOT TIME TBA"] },
  { kicker: "STREAKS & PERKS", title: "STREAK INCENTIVES", body: "Rewards for keeping an unbroken shift streak, plus ecosystem perks and airdrops.", foot: ["YOUR STREAK", ""] },
] as const;

function LiveDraw({ game, data, reload }: { game: Game; data: RafflesResponse; reload: () => void }) {
  const [count, setCount] = useState(1);
  const [token, setToken] = useState("");
  const open = data.raffles.find((r) => r.status === "open");
  const shift = game.shift;
  if (!open) {
    return (
      <HqCard>
        <MonoLabel>THIS DRAW</MonoLabel>
        <p className="mt-2 mb-0 text-dust">No draw is open right now. The next one is announced in Discord, with its snapshot time.</p>
      </HqCard>
    );
  }
  const holder = BigInt(open.ticketPrice) === 0n;
  const mine = data.mine.filter((m) => m.raffleId === open.id);
  const entered = mine.reduce((n, m) => n + m.count, 0);
  const miners = shift?.raffle.entries ?? 0;

  const enter = async () => {
    await game.act("enter", () => api<{ count: number }>(`/api/raffles/${open.id}/enter`, { body: {} }), (d) => `You're in with ${d.count} ${d.count === 1 ? "entry" : "entries"}.`);
    reload();
  };
  const buy = async () => {
    if (turnstileEnabled && !token) return game.setNotice({ kind: "bad", text: "Complete the human check first." });
    await game.act(
      "tickets",
      () => api<{ count: number; cost: string }>(`/api/raffles/${open.id}/tickets`, { body: { count, turnstileToken: token }, idempotencyKey: newIdempotencyKey("tix") }),
      (d) => `Bought ${d.count} ticket(s) for ${fmtInt(d.cost)} $VALLEY.`,
    );
    reload();
  };

  return (
    <HqCard className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <MonoLabel>DRAW #{open.id} · {holder ? "HOLDER RAFFLE · FREE ENTRY" : "TICKET RAFFLE"}</MonoLabel>
          <h2 className="mt-1 mb-0 font-pixel text-[38px] font-normal leading-none">{open.title.toUpperCase()}</h2>
        </div>
        <Link href={`/raffles/${open.id}`} className="font-mono text-xs tracking-[1px]">
          HOW THE WINNER IS DRAWN →
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-2.5">
        {[
          ["PRIZE", `${fmtInt(open.prizeAmount)} $VALLEY`, "text-gold"],
          [holder ? "ENTRIES SO FAR" : "TICKETS SOLD", fmtInt(open.totalTickets), ""],
          ["DRAW BLOCK", fmtInt(open.closeBlockHeight), ""],
          ["YOUR ENTRIES", fmtInt(entered), "text-moss"],
        ].map(([k, v, c]) => (
          <div key={k} className="border-3 border-black bg-bedrock px-3.5 py-3">
            <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">{k}</div>
            <div className={cx("text-[22px] font-bold", c)}>{v}</div>
          </div>
        ))}
      </div>
      <div className="border-2 border-rock px-3 py-2.5 font-mono text-[11.5px] text-khaki">
        SEED COMMITMENT · sha256(seed) <span className="break-all text-cream">{open.seedHash}</span>
      </div>
      {holder ? (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton tone="gold" live={!entered && miners > 0} disabled={!!entered || miners === 0 || game.busy !== null} onClick={enter}>
            {entered ? `ENTERED WITH ${entered}` : `ENTER WITH ${miners} ${miners === 1 ? "MINER" : "MINERS"}`}
          </ActionButton>
          <span className="text-[13.5px] text-dust">One free entry per active Valley Miner, once per draw.</span>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 font-mono text-[11px] tracking-[1.5px] text-khaki">
              TICKETS
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="w-24 border-3 border-clay bg-bedrock px-3 py-2 text-cream"
              />
            </label>
            <ActionButton tone="gold" live disabled={game.busy !== null} onClick={buy}>
              BUY · {fmtInt((BigInt(open.ticketPrice) * BigInt(count)).toString())}
            </ActionButton>
          </div>
          <Turnstile onToken={setToken} />
          <span className="text-[13.5px] text-dust">Tickets are paid from your in-game $VALLEY and leave circulation.</span>
        </div>
      )}
      {mine.length ? (
        <div className="font-mono text-xs text-moss">
          Your entry numbers: {mine.map((m) => (m.count === 1 ? `#${m.startIndex}` : `#${m.startIndex}–#${m.startIndex + m.count - 1}`)).join(", ")}
        </div>
      ) : null}
    </HqCard>
  );
}

function PastDraws({ data }: { data: RafflesResponse }) {
  const past = data.raffles.filter((r) => r.status !== "open");
  return (
    <HqCard>
      <h2 className="m-0 font-pixel text-[32px] font-normal leading-none">PAST DRAWS</h2>
      <div className="mt-3.5 grid gap-2">
        {past.length === 0 ? <p className="m-0 text-sm text-dust">None yet.</p> : null}
        {past.map((r) => (
          <div key={r.id} className="grid gap-1 border-2 border-rock px-3 py-2.5 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-pixel text-xl leading-none">
                #{r.id} {r.title.toUpperCase()}
              </span>
              <span className={cx("font-mono text-xs tracking-[1px]", r.status === "drawn" ? "text-gold" : "text-khaki")}>{r.status.toUpperCase()}</span>
            </div>
            <div className="text-khaki">
              {fmtInt(r.totalTickets)} entries · seed {short(r.seed ?? r.seedHash, 8, 6)}
              {r.winners?.length ? ` · winning entry #${r.winners.map((w) => w.index).join(", #")}` : ""}
            </div>
            <Link href={`/raffles/${r.id}`} className="font-mono text-xs">
              VERIFY ▸
            </Link>
          </div>
        ))}
      </div>
    </HqCard>
  );
}

export function RafflesTab({ game }: { game: Game }) {
  const [data, setData] = useState<RafflesResponse | null>(null);
  const load = useCallback(() => {
    api<RafflesResponse>("/api/raffles").then((r) => r.ok && setData(r.data));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const shift = game.shift;
  const open = data?.raffles.find((r) => r.status === "open");
  const entered = open && data ? data.mine.filter((m) => m.raffleId === open.id).reduce((n, m) => n + m.count, 0) : 0;
  const entries = entered || shift?.raffle.entries || 0;

  return (
    <div className="grid gap-5">
      <section
        aria-labelledby="raffle-h"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-end gap-6 border-3 border-black bg-gold p-[clamp(20px,3vw,32px)] text-night shadow-px-10"
      >
        <div>
          <div className="font-mono text-xs font-bold tracking-[2px]">COMMUNITY RAFFLES &amp; HOLDER BENEFITS · 8%</div>
          <h1 id="raffle-h" className="mt-2 mb-0 font-pixel text-[clamp(48px,5.4vw,76px)] font-normal leading-[.9]">
            HOLDER RAFFLES &amp; AIRDROPS
          </h1>
          <p className="mt-3 mb-0 max-w-[560px] text-base text-umber-3">
            Dedicated to regular holder lotteries, streak incentives and ecosystem perks: daily holder rewards, item raffles and airdrops.
          </p>
        </div>
        <div className="border-3 border-black bg-night p-[18px] text-cream">
          <div className="font-mono text-[11px] tracking-[1.5px] text-khaki">ALLOCATION</div>
          <div className="text-[clamp(28px,3vw,38px)] font-extrabold leading-[1.1] text-gold">800,000,000</div>
          <div className="text-sm text-dust">$VALLEY · 8% of total supply</div>
        </div>
      </section>

      {game.notice ? (
        <div role="status" aria-live="polite" className={cx("text-sm", game.notice.kind === "bad" ? "text-ember" : "text-moss")}>
          {game.notice.text}
        </div>
      ) : null}

      {data ? <LiveDraw game={game} data={data} reload={load} /> : <HqCard className="text-dust">Loading raffles…</HqCard>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5">
        {KINDS.map((k) => (
          <HqCard as="article" key={k.title} className="grid content-start gap-2">
            <MonoLabel>{k.kicker}</MonoLabel>
            <h2 className="m-0 font-pixel text-[34px] font-normal leading-none">{k.title}</h2>
            <p className="m-0 text-sm text-dust">{k.body}</p>
            <div className="flex justify-between gap-2.5 border-t-2 border-rock pt-2.5 font-mono text-[11.5px]">
              <span className="text-khaki">{k.foot[0]}</span>
              <span className="text-gold">{k.foot[1] || `${shift?.streak.days ?? 0} ${shift?.streak.days === 1 ? "DAY" : "DAYS"}`}</span>
            </div>
          </HqCard>
        ))}
      </div>

      <HqCard className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-center gap-4">
        <div>
          <MonoLabel>YOUR ENTRIES TODAY</MonoLabel>
          <div className="font-pixel text-[56px] leading-none">{entries}</div>
        </div>
        <div className="text-sm text-dust">One entry per Valley Miner you hold. Entry rules, prizes and draw times are confirmed before launch, along with the snapshot schedule.</div>
        <div className="text-sm text-dust">Season 1 holders also get early access and preferential placement for Season 2 mints and future token distributions.</div>
      </HqCard>

      {data ? <PastDraws data={data} /> : null}
    </div>
  );
}
