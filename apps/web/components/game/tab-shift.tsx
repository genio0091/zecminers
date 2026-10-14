"use client";

import { useState } from "react";
import { NFT_MINERS_SUPPLY } from "@hoodvalley/economy";
import { api } from "@/lib/client-api";
import { useClock } from "@/lib/use-clock";
import { LazyVideo } from "../lazy-video";
import { cx } from "../ui";
import { ActionButton, GhostButton, HqCard, MinerMedia, MonoLabel, fmtInt, hms, utcDate, utcTime } from "./hq-ui";
import type { Miner, Shift, Tab } from "./types";
import type { Game } from "./use-game";

const STATUS: Record<Miner["status"], { label: string; chip: string }> = {
  ready: { label: "READY", chip: "bg-cream text-night" },
  waiting: { label: "WAITING FOR WINDOW", chip: "bg-cream text-night" },
  extracting: { label: "EXTRACTING", chip: "bg-gold text-night" },
  claimable: { label: "CLAIM READY", chip: "bg-moss text-night" },
  needs_gear: { label: "NEEDS GEAR-UP", chip: "bg-ember text-night" },
  geared: { label: "GEARED UP", chip: "bg-sky text-night" },
  stopped: { label: "STOPPED", chip: "bg-ember text-night" },
};

const SELECT_LABEL: Record<Miner["status"], string> = {
  ready: "SELECT FOR SHIFT",
  waiting: "WINDOW CLOSED",
  extracting: "ON SHIFT",
  claimable: "READY TO CLAIM",
  needs_gear: "GEAR UP ABOVE",
  geared: "READY NEXT SHIFT",
  stopped: "PASS MOVED · STOPPED",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What a Miner has extracted so far (the estimate firms up as more Miners join). */
function progressOf(m: Miner, now: number) {
  const s = m.session;
  if (!s) return null;
  if (m.status === "extracting") {
    const start = Date.parse(s.deployedAt);
    const frac = Math.min(1, Math.max(0, (now - start) / Math.max(1, Date.parse(s.endsAt) - start)));
    return { pct: frac * 100, label: "EXTRACTED SO FAR", value: Number(s.share) * frac };
  }
  if (m.status === "claimable") return { pct: 100, label: s.shift ? `SHIFT ${s.shift} SHARE` : "SHIFT SHARE", value: Number(s.share) };
  if (m.status === "needs_gear") return { pct: 100, label: "CLAIMED", value: Number(s.reward ?? 0) };
  return null;
}

function ShiftClock({ shift, now }: { shift: Shift; now: number }) {
  const c = shift.clock;
  const opens = Date.parse(c.opensAt);
  const closes = Date.parse(c.closesAt);
  const next = Date.parse(c.nextOpensAt);
  const pct = c.open ? (now - opens) / (closes - opens) : (now - closes) / (next - closes);
  const remaining = (c.open ? closes : next) - now;
  const yourShare = shift.miners
    .filter((m) => m.session && m.session.day === c.day && (m.status === "extracting" || m.status === "claimable"))
    .reduce((sum, m) => sum + Number(m.session!.share), 0);
  const window = `${String(c.openHourUtc).padStart(2, "0")}:00–${String((c.openHourUtc + c.shiftHours) % 24).padStart(2, "0")}:00 UTC`;

  return (
    <section aria-labelledby="shift-h" className="relative overflow-hidden border-3 border-black bg-[#13281B] shadow-px-8">
      <LazyVideo clip="valley-map" eager label="" className="absolute inset-0 h-full opacity-[.22]" />
      <div className="relative grid gap-[18px] p-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 font-mono text-xs tracking-[2px] text-gold-hi">
              <span aria-hidden className={cx("block size-2.5 animate-blink-fast", c.open ? "bg-moss" : "bg-ember")} />
              <span>
                {shift.season.started ? `SHIFT ${c.shift} · SEASON 1 DAY ${c.shift} OF ${shift.season.days}` : `SHIFT DAY ${utcDate(c.opensAt).toUpperCase()} · SEASON 1 NOT STARTED`}
              </span>
            </div>
            <h1 id="shift-h" className="mt-1.5 mb-0 font-pixel text-[clamp(44px,5vw,64px)] font-normal leading-[.9] text-cream">
              {c.open ? "MINING WINDOW OPEN" : "WINDOW CLOSED · OFF-SHIFT"}
            </h1>
          </div>
          <div className="text-right">
            <div className={cx("font-pixel text-[clamp(48px,5.4vw,72px)] leading-[.9] tabular", c.open ? "text-gold" : "text-sky")} aria-live="off">
              {hms(remaining)}
            </div>
            <div className="font-mono text-[11px] tracking-[1.5px] text-sand">{c.open ? "LEFT IN TODAY'S 12-HOUR WINDOW" : "UNTIL THE NEXT WINDOW OPENS"}</div>
          </div>
        </div>
        <div>
          <div aria-hidden className="h-[18px] border-3 border-black bg-bedrock">
            <div className={cx("h-full animate-stripe [background-size:40px_100%]", c.open ? "stripes-gold" : "stripes-sky")} style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between gap-3 font-mono text-[10.5px] tracking-[1px] text-sand">
            <span>{c.open ? `WINDOW OPENED ${utcTime(c.opensAt)} UTC` : `WINDOW CLOSED ${utcTime(c.closesAt)} UTC`}</span>
            <span>{c.open ? `WINDOW CLOSES ${utcTime(c.closesAt)} UTC` : `NEXT SHIFT ${utcTime(c.nextOpensAt)} UTC`}</span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-2.5">
          <div className="border-3 border-black bg-bedrock px-3.5 py-3">
            <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">TODAY&apos;S POOL</div>
            <div className="text-[22px] font-bold">{fmtInt(shift.shift.pool)}</div>
          </div>
          <div className="border-3 border-black bg-bedrock px-3.5 py-3">
            <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">MINERS ON THIS SHIFT</div>
            <div className="text-[22px] font-bold">
              {fmtInt(shift.shift.miners)} <span className="text-sm font-medium text-khaki">/ {fmtInt(NFT_MINERS_SUPPLY)}</span>
            </div>
          </div>
          <div className="border-3 border-black bg-bedrock px-3.5 py-3">
            <div className="font-mono text-[10.5px] tracking-[1.5px] text-khaki">YOUR SHARE THIS SHIFT</div>
            <div className="text-[22px] font-bold text-gold">{yourShare > 0 ? `${fmtInt(yourShare)} $VALLEY` : "Deploy to earn"}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-cream/25 pt-3.5">
          <span className="font-mono text-[11px] tracking-[1px] text-sand">SERVER CLOCK · ONE WINDOW A DAY, {window} · launch times confirmed before release</span>
          {shift.blocker ? <span className="border-2 border-ember px-3 py-1.5 font-mono text-xs tracking-[1px] text-ember">{shift.blocker}</span> : null}
        </div>
      </div>
    </section>
  );
}

function MinerCard({ m, now, selected, onToggle }: { m: Miner; now: number; selected: boolean; onToggle: () => void }) {
  const meta = STATUS[m.status];
  const prog = progressOf(m, now);
  const selectable = m.status === "ready";
  return (
    <article
      aria-label={`Valley Miner ${m.label}`}
      className={cx("flex flex-col border-3 bg-bedrock", selected ? "border-gold shadow-[6px_6px_0_#F2B949]" : "border-black shadow-px-6")}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-3 border-black">
        <MinerMedia kind={m.kind} className="absolute inset-0" />
        <span className={cx("absolute left-2.5 top-2.5 border-2 border-black px-2 py-1 font-mono text-[10.5px] font-bold tracking-[1.5px]", meta.chip)}>
          {meta.label}
        </span>
      </div>
      <div className="grid flex-1 gap-2 p-3.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 className="m-0 font-pixel text-[30px] font-normal leading-none">MINER {m.label}</h3>
          <span className="font-mono text-[11px] text-khaki">{m.role}</span>
        </div>
        <div className="text-[13px] text-dust">{m.traits}</div>
        <div className="flex justify-between gap-2.5 font-mono text-[11px] tracking-[.5px]">
          <span className="text-khaki">TRAIT POWER (PRE-MINT)</span>
          <span className="font-bold text-cream">{(m.powerBp / 10_000).toFixed(2)}×</span>
        </div>
        {prog ? (
          <div>
            <div aria-hidden className="h-3 border-2 border-black bg-rock">
              <div className={cx("h-full stripes-gold", m.status === "extracting" && "animate-stripe")} style={{ width: `${prog.pct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between gap-2.5 font-mono text-[11px]">
              <span className="text-khaki">{prog.label}</span>
              <span className="font-bold text-gold">{fmtInt(prog.value)} $VALLEY</span>
            </div>
          </div>
        ) : null}
        <div className="mt-auto pt-1.5">
          <button
            type="button"
            onClick={onToggle}
            disabled={!selectable}
            aria-pressed={selected}
            className={cx(
              "w-full cursor-pointer border-3 border-black px-3 py-[11px] font-mono text-xs tracking-[1px]",
              selected ? "bg-gold text-night" : selectable ? "bg-rock text-cream hover:bg-clay" : "bg-card text-stone",
            )}
          >
            {selected ? "SELECTED FOR SHIFT" : SELECT_LABEL[m.status]}
          </button>
        </div>
      </div>
    </article>
  );
}

function YourMiners({ game, shift, now }: { game: Game; shift: Shift; now: number }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const { act, busy, notice, setNotice } = game;
  const miners = shift.miners;
  const count = (s: Miner["status"]) => miners.filter((m) => m.status === s).length;
  const ready = miners.filter((m) => m.status === "ready");
  const selected = ready.filter((m) => picked[m.slotId]);
  const claimable = count("claimable");
  const toGear = count("needs_gear");
  const canDeploy = shift.clock.open && selected.length > 0 && !shift.blocker;

  const deploy = () => {
    if (!shift.clock.open) return setNotice({ kind: "bad", text: "The mining window is closed. Deploy when the next shift opens." });
    if (!selected.length) return setNotice({ kind: "bad", text: "Select at least one ready Miner first." });
    act(
      "deploy",
      () => api<{ deployed: number; late: boolean }>("/api/shift/deploy", { body: { slotIds: selected.map((m) => m.slotId) } }),
      (d) => {
        setPicked({});
        return `Deployed. Your Miners extract until the window closes.${d.late ? " Joining late means a shorter shift and a smaller share." : ""}`;
      },
    );
  };
  const claim = () =>
    act("claim", () => api<{ total: string; claimed: number }>("/api/shift/claim", { body: {} }), (d) =>
      `Claimed ${fmtInt(d.total)} $VALLEY from ${plural(d.claimed, "Miner")}. Gear up before the next shift to keep your streak.`,
    );
  const gear = () =>
    act("gear", () => api<{ geared: number; streak: number; bonus: string }>("/api/shift/gear", { body: {} }), (d) =>
      `Geared up ${plural(d.geared, "Miner")}. Streak is ${plural(d.streak, "day")}.${d.bonus !== "0" ? ` +${fmtInt(d.bonus)} $VALLEY streak bonus.` : ""}`,
    );
  const selectReady = () => {
    if (!ready.length) return setNotice({ kind: "bad", text: shift.clock.open ? "No Miners are ready right now." : "The window is closed. Miners are ready when it opens." });
    setPicked(Object.fromEntries(ready.map((m) => [m.slotId, true])));
    setNotice(null);
  };

  return (
    <HqCard aria-labelledby="miners-h">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h2 id="miners-h" className="m-0 font-pixel text-[38px] font-normal leading-none">
            YOUR MINERS
          </h2>
          <div className="font-mono text-[11px] tracking-[1.5px] text-khaki">
            {miners.length} HELD · {ready.length} READY · {count("extracting")} ON SHIFT · {claimable} TO CLAIM
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={selectReady}>SELECT ALL READY</GhostButton>
          <ActionButton tone="gold" live={canDeploy} disabled={!canDeploy || busy !== null} onClick={deploy}>
            {busy === "deploy" ? "DEPLOYING…" : `DEPLOY${selected.length ? ` (${selected.length})` : ""}`}
          </ActionButton>
          <ActionButton tone="moss" live={claimable > 0} disabled={!claimable || busy !== null} onClick={claim}>
            {busy === "claim" ? "CLAIMING…" : `CLAIM${claimable ? ` (${claimable})` : ""}`}
          </ActionButton>
          <ActionButton tone="sky" live={toGear > 0} disabled={!toGear || busy !== null} onClick={gear}>
            {busy === "gear" ? "GEARING…" : `GEAR UP${toGear ? ` (${toGear})` : ""}`}
          </ActionButton>
        </div>
      </div>
      <div role="status" aria-live="polite" className={cx("mt-2.5 min-h-[22px] text-sm", notice?.kind === "bad" ? "text-ember" : "text-moss")}>
        {notice?.text}
      </div>
      {miners.length ? (
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
          {miners.map((m) => (
            <MinerCard key={m.slotId} m={m} now={now} selected={!!picked[m.slotId] && m.status === "ready"} onToggle={() => setPicked((p) => ({ ...p, [m.slotId]: !p[m.slotId] }))} />
          ))}
        </div>
      ) : (
        <p className="mt-1.5 mb-0 text-dust">No Valley Miner is linked to this account yet. Link your pass in the Wallet tab.</p>
      )}
    </HqCard>
  );
}

function Activity({ shift }: { shift: Shift }) {
  return (
    <HqCard aria-labelledby="log-h">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="log-h" className="m-0 font-pixel text-[32px] font-normal leading-none">
          ACTIVITY
        </h2>
        <span className="font-mono text-[11px] tracking-[1.5px] text-khaki">RECENT · SERVER TIME (UTC)</span>
      </div>
      <ol className="mt-3.5 mb-0 grid list-none gap-2 p-0">
        {shift.activity.length === 0 ? <li className="border-2 border-rock px-3 py-2.5 text-sm text-dust">Nothing yet. Deploy a Miner when the window opens.</li> : null}
        {shift.activity.map((e) => (
          <li key={`${e.at}-${e.text}`} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-3 border-2 border-rock px-3 py-2.5 text-sm">
            <span className="font-mono text-[11.5px] text-khaki">
              {e.shift ? `Shift ${e.shift}` : utcDate(e.at)} · {utcTime(e.at)}
            </span>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>
    </HqCard>
  );
}

function SeasonCard({ shift }: { shift: Shift }) {
  const s = shift.season;
  const pct = Number((BigInt(s.minedBeforeToday) * 10_000n) / BigInt(s.pool)) / 100;
  return (
    <HqCard>
      <MonoLabel>SEASON 1</MonoLabel>
      <div className="mt-1 font-pixel text-[44px] leading-none">
        {s.started ? (
          <>
            DAY {s.day} <span className="text-khaki">/ {s.days}</span>
          </>
        ) : (
          "NOT STARTED"
        )}
      </div>
      <div aria-hidden className="mt-2.5 h-3.5 border-3 border-black bg-rock">
        <div className="h-full bg-amber" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-3.5 grid gap-2 text-sm">
        <div className="flex justify-between gap-2.5">
          <span className="text-khaki">Mined before today</span>
          <span className="font-bold tabular">{fmtInt(s.minedBeforeToday)}</span>
        </div>
        <div className="flex justify-between gap-2.5">
          <span className="text-khaki">Left in the pool</span>
          <span className="font-bold tabular">{s.funded ? fmtInt(s.poolLeft) : "Funded at genesis"}</span>
        </div>
        <div className="flex justify-between gap-2.5">
          <span className="text-khaki">Season progress</span>
          <span className="font-bold tabular">{pct.toFixed(1)}%</span>
        </div>
      </div>
    </HqCard>
  );
}

function StreakCard({ shift }: { shift: Shift }) {
  const st = shift.streak;
  return (
    <HqCard>
      <MonoLabel>STREAK</MonoLabel>
      <div className="mt-1 font-pixel text-[44px] leading-none">{plural(st.days, "DAY", "DAYS")}</div>
      <div aria-hidden className="mt-3 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={cx("block h-[18px] border-3 border-black", i < Math.min(7, st.days) ? "bg-moss" : "bg-rock")} />
        ))}
      </div>
      <p className="mt-3 mb-0 text-[13.5px] text-dust">
        Gear up your Miners after you claim to keep the streak unbroken.
        {st.nextBonus === "0"
          ? " Streak bonus sizes are confirmed before launch."
          : st.gearedToday
            ? ` Geared up today. Tomorrow's bonus: +${fmtInt(st.nextBonus)} $VALLEY from the community pool.`
            : ` Next gear-up bonus: +${fmtInt(st.nextBonus)} $VALLEY from the community pool.`}
      </p>
    </HqCard>
  );
}

function RaffleCard({ shift, onOpen }: { shift: Shift; onOpen: () => void }) {
  const r = shift.raffle;
  return (
    <section className="border-3 border-black bg-gold p-5 text-night shadow-px-8">
      <div className="font-mono text-[11px] font-bold tracking-[2px]">HOLDER RAFFLE</div>
      <div className="mt-1 font-pixel text-4xl leading-none">{plural(r.entries, "ENTRY", "ENTRIES")} TODAY</div>
      <p className="mt-2 mb-0 text-[13.5px] text-umber-3">
        Draws come from the 8% community allocation.{" "}
        {r.openId ? (r.entered ? `You're in raffle #${r.openId} with ${r.entered}.` : `Raffle #${r.openId} is open.`) : "Next draw: snapshot time TBA."}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 cursor-pointer border-3 border-black bg-night px-3 py-2.5 font-mono text-xs tracking-[1px] text-gold hover:text-gold-hi"
      >
        OPEN RAFFLES →
      </button>
    </section>
  );
}

export function ShiftTab({ game, go }: { game: Game; go: (t: Tab) => void }) {
  const clock = useClock(game.offsetMs);
  const shift = game.shift;
  if (!shift) return null;
  // Before the shared ticker starts (server render), fall back to the server's own time.
  const now = clock ?? Date.parse(shift.serverTime);
  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="grid min-w-0 flex-[999_1_640px] gap-5">
        <ShiftClock shift={shift} now={now} />
        <YourMiners game={game} shift={shift} now={now} />
        <Activity shift={shift} />
      </div>
      <aside aria-label="Season and streak" className="grid min-w-0 flex-[1_1_300px] gap-5">
        <SeasonCard shift={shift} />
        <StreakCard shift={shift} />
        <RaffleCard shift={shift} onOpen={() => go("raffles")} />
      </aside>
    </div>
  );
}
