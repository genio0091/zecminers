"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmt, short } from "@/lib/client-api";
import { useClock } from "@/lib/use-clock";
import { Turnstile, turnstileEnabled } from "../turnstile";
import { cx } from "../ui";
import { ActionButton, GhostButton, HqCard, MonoLabel, fmtInt } from "./hq-ui";
import type { LedgerRow, PayoutRow } from "./types";
import type { Game } from "./use-game";

const PAYOUT_STATUS: Record<string, [string, string]> = {
  pending: ["QUEUED", "text-khaki"],
  approved: ["APPROVED", "text-gold"],
  signing: ["SIGNING", "text-gold"],
  inscribed: ["SENDING · TX 1/2", "text-gold"],
  sent: ["SENT · WAITING FOR FINALITY", "text-gold"],
  settled: ["SETTLED", "text-moss"],
  failed: ["FAILED · RETRYING", "text-ember"],
  returned: ["RETURNED TO BALANCE", "text-khaki"],
};

const KIND: Record<string, string> = {
  shift_claim: "Shift claim",
  streak_bonus: "Streak bonus",
  raffle_ticket: "Raffle tickets",
  raffle_prize: "Raffle prize",
  community_grant: "Holder grant",
  payout_cutoff: "Moved to weekly payout",
  payout_returned: "Payout returned",
  // Entries from before Hood Valley.
  mining_collect: "Mining collect",
  daily_reward: "Daily reward",
  marketing_grant: "Grant",
  upgrade: "Upgrade",
  repair: "Repair",
  ore_exchange: "Ore exchange",
};

function countdown(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  return `${d}D ${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

function LinkPass({ game }: { game: Game }) {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!/^t1[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(address.trim())) return setMsg({ ok: false, text: "That is not a valid pass address (t1…)." });
    if (code.trim().length < 8) return setMsg({ ok: false, text: "Enter the claim code that came with your pass." });
    if (turnstileEnabled && !token) return setMsg({ ok: false, text: "Complete the human check." });
    const res = await game.act("link", () => api("/api/wallet/link", { body: { address: address.trim(), claimCode: code.trim(), turnstileToken: token } }));
    setMsg(res.ok ? { ok: true, text: "Pass linked. Your Valley Miner is on the Shift screen." } : { ok: false, text: res.error.message });
  }
  const field = "border-3 border-clay bg-bedrock p-3 font-mono text-sm text-cream placeholder:text-stone";
  return (
    <form onSubmit={link} noValidate className="mt-3 grid gap-3">
      <p className="m-0 text-sm text-dust">Enter the address your Valley Miner pass is registered to, and its claim code. One pass, one account.</p>
      <label className="grid gap-1.5 font-mono text-[11px] tracking-[1.5px] text-khaki">
        PASS ADDRESS
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="t1…" spellCheck={false} autoComplete="off" className={field} />
      </label>
      <label className="grid gap-1.5 font-mono text-[11px] tracking-[1.5px] text-khaki">
        CLAIM CODE
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ZM-XXXX-XXXX" spellCheck={false} autoComplete="off" className={field} />
      </label>
      <Turnstile onToken={setToken} />
      <ActionButton tone="gold" live type="submit" disabled={game.busy !== null} className="justify-self-start">
        {game.busy === "link" ? "VERIFYING…" : "LINK PASS"}
      </ActionButton>
      <div role="status" className={cx("min-h-5 text-sm", msg?.ok ? "text-moss" : "text-ember")}>
        {msg?.text}
      </div>
    </form>
  );
}

function Ledger() {
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
    <HqCard>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-pixel text-[32px] font-normal leading-none">LEDGER</h2>
        <span className="font-mono text-[11px] tracking-[1.5px] text-khaki">EVERY LINE IS IMMUTABLE · YOUR BALANCE IS THEIR SUM</span>
      </div>
      <div className="mt-3.5 grid gap-2">
        {rows.length === 0 && !loading ? <div className="border-2 border-rock px-3 py-2.5 text-sm text-dust">Nothing yet. Claim your first shift to see it here.</div> : null}
        {rows.map((r) => {
          const n = BigInt(r.amount);
          return (
            <div key={r.entryId} className="grid grid-cols-[1fr_auto] gap-3 border-2 border-rock px-3 py-2.5 text-sm sm:grid-cols-[170px_1fr_auto]">
              <span className="font-mono text-[11.5px] text-khaki">{new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
              <span className="hidden sm:block">
                {KIND[r.kind] ?? r.kind}
                {r.memo ? <span className="text-khaki"> · {r.memo}</span> : null}
              </span>
              <span className={cx("text-right font-bold tabular", n >= 0n ? "text-moss" : "text-ember")}>
                {n >= 0n ? "+" : ""}
                {fmt(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
      {!done ? (
        <GhostButton className="mt-3" disabled={loading} onClick={() => load(cursor)}>
          {loading ? "LOADING…" : "LOAD MORE"}
        </GhostButton>
      ) : null}
    </HqCard>
  );
}

export function WalletTab({ game }: { game: Game }) {
  const { me, offsetMs } = game;
  const clock = useClock(offsetMs);
  const [rows, setRows] = useState<PayoutRow[] | null>(null);
  const [explorer, setExplorer] = useState<string | null>(null);
  useEffect(() => {
    api<{ payouts: PayoutRow[]; explorerBaseUrl: string | null }>("/api/payouts").then((r) => {
      if (r.ok) {
        setRows(r.data.payouts);
        setExplorer(r.data.explorerBaseUrl);
      } else setRows([]);
    });
  }, []);
  if (!me) return null;
  const now = clock ?? Date.parse(game.shift?.serverTime ?? me.nextPayout.cutoffAt);
  const pass = me.pass;
  const tx = (txid: string | null) =>
    !txid ? "—" : explorer ? (
      <a href={`${explorer.replace(/\/$/, "")}/tx/${txid}`} target="_blank" rel="noreferrer">
        {short(txid, 8, 6)}
      </a>
    ) : (
      short(txid, 8, 6)
    );

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        {[
          ["IN-GAME BALANCE", `${fmtInt(me.balance)} $VALLEY`, "text-gold"],
          ["PAID OUT TO YOU", `${fmtInt(me.paidOutTotal)} $VALLEY`, ""],
          ["NEXT WEEKLY PAYOUT", countdown(Date.parse(me.nextPayout.cutoffAt) - now), ""],
          ["MINIMUM PAYOUT", `${fmtInt(me.nextPayout.minimum)} $VALLEY`, ""],
        ].map(([k, v, c]) => (
          <HqCard key={k} className="p-4">
            <MonoLabel>{k}</MonoLabel>
            <div className={cx("mt-1 text-[22px] font-bold leading-tight [overflow-wrap:anywhere]", c)}>{v}</div>
          </HqCard>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-5">
        <HqCard>
          <MonoLabel>VALLEY MINER PASS</MonoLabel>
          {pass ? (
            <div className="mt-3 grid gap-2.5 text-sm">
              {pass.isTest ? (
                <div className="border-2 border-sky px-3 py-2 font-mono text-xs tracking-[1px] text-sky">TEAM TEST PASS · PLAYS NORMALLY, NEVER PAID OUT</div>
              ) : null}
              <div className="flex flex-wrap justify-between gap-3 border-2 border-rock px-3 py-2.5">
                <span className="text-khaki">Pass</span>
                <span className="font-bold">#{String(pass.passNumber).padStart(4, "0")}</span>
              </div>
              <div className="grid gap-1 border-2 border-rock px-3 py-2.5">
                <span className="text-khaki">Address · payouts go here</span>
                <span className="break-all font-mono text-[13px] text-moss">{pass.originAddress}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-3 border-2 border-rock px-3 py-2.5">
                <span className="text-khaki">Status</span>
                <span className={pass.status === "active" ? "text-moss" : "text-ember"}>{pass.status.toUpperCase()}</span>
              </div>
              <p className="m-0 text-[13px] text-dust">
                At every weekly cutoff your in-game balance is queued, approved by the team and sent to this address. Hood Valley will never ask for your seed phrase
                or private key.
              </p>
            </div>
          ) : (
            <LinkPass game={game} />
          )}
        </HqCard>

        <HqCard>
          <h2 className="m-0 font-pixel text-[32px] font-normal leading-none">PAYOUT HISTORY</h2>
          <div className="mt-3.5 grid gap-2">
            {rows === null ? <div className="text-sm text-dust">Loading…</div> : null}
            {rows && rows.length === 0 ? (
              <div className="border-2 border-rock px-3 py-2.5 text-sm text-dust">No payouts yet. The first one comes at the next cutoff once your balance is above the minimum.</div>
            ) : null}
            {rows?.map((r) => {
              const [label, color] = PAYOUT_STATUS[r.status] ?? [r.status.toUpperCase(), "text-dust"];
              return (
                <div key={`${r.week}-${r.status}`} className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] items-center gap-3 border-2 border-rock px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">WEEK</div>
                    {r.week}
                  </div>
                  <div>
                    <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">AMOUNT</div>
                    <span className="font-bold text-gold">{fmtInt(r.amount)}</span>
                  </div>
                  <div className="truncate">
                    <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">TX</div>
                    {tx(r.sendTxid)}
                  </div>
                  <div className={cx("font-mono text-xs", color)}>{label}</div>
                </div>
              );
            })}
          </div>
        </HqCard>
      </div>

      <Ledger />
    </div>
  );
}
