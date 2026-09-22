"use client";

import { useEffect, useState } from "react";
import { ORE_LABELS, formatCountdown, type OreId } from "@zecminers/economy";
import { api, fmt, newIdempotencyKey, short } from "@/lib/client-api";
import { LazyVideo } from "../lazy-video";
import { Button, FinePrint, Label, Panel, Row, Well, cx } from "../ui";
import { MineScene, type SceneState } from "./mine-scene";
import type { InventoryItem, Me, Slot } from "./types";
import type { useGame } from "./use-game";

const STATE_BADGE: Record<Slot["state"], [string, string]> = {
  idle: ["READY TO MINE", "bg-coal text-gold-hi"],
  mining: ["MINING", "bg-gold text-ink"],
  ready: ["COLLECT", "bg-moss text-ink"],
  broken: ["BROKEN", "bg-ember text-ink"],
  repairing: ["REPAIRING", "bg-olive text-cream"],
  stopped: ["STOPPED", "bg-ember text-ink"],
};
const ORE_COLOR: Record<OreId, string> = { goldstone: "bg-gold-hi", grapestone: "bg-grape", mint_stone: "bg-mint" };

function useNow(offsetMs: number, everyMs = 1000) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetMs), everyMs);
    return () => clearInterval(t);
  }, [offsetMs, everyMs]);
  return now;
}

/** Local estimate with the same integer formula the server uses at collect. */
function accruedAt(slot: Slot, now: number): { amount: bigint; pct: number; hours: number } {
  const s = slot.session;
  if (!s) return { amount: 0n, pct: 0, hours: 0 };
  const elapsed = Math.max(0, Math.min(now, Date.parse(s.endsAt)) - Date.parse(s.startedAt));
  const amount = (BigInt(s.baseRatePerHour) * BigInt(Math.floor(elapsed)) * BigInt(s.levelMultiplierBp)) / (3_600_000n * 10_000n);
  return { amount, pct: Math.min(100, (elapsed / s.sessionMs) * 100), hours: elapsed / 3_600_000 };
}

export function MineTab({ game, onGoPass }: { game: ReturnType<typeof useGame>; onGoPass: () => void }) {
  const { me, slots, inventory, offsetMs, busy, act, notice } = game;
  const now = useNow(offsetMs);
  const slot = slots[0];
  const [sceneMode, setSceneMode] = useState<"game" | "clip">("game");
  const [collectFx, setCollectFx] = useState<SceneState["collect"]>(null);

  if (!me) return null;
  if (!slot) {
    return (
      <Panel className="grid max-w-[720px] gap-3 p-6">
        <div className="font-pixel text-3xl">No mining slot yet</div>
        <p className="m-0 text-dust">
          Link the address your Whitelist Pass was airdropped to, with the one-time claim code from your airdrop message. One pass gives you one slot and the
          starter miner Zandy.
        </p>
        <div>
          <Button onClick={onGoPass}>Link your pass</Button>
        </div>
      </Panel>
    );
  }

  const acc = accruedAt(slot, now);
  const doneToday = slot.state === "idle" && slot.usedToday;
  const [badge, badgeClass] = doneToday ? ["DONE FOR TODAY", "bg-coal text-khaki"] : STATE_BADGE[slot.state];
  const balance = BigInt(me.balance);
  const canAffordUpgrade = slot.upgradeCost !== null && balance >= BigInt(slot.upgradeCost);
  const canAffordRepair = balance >= BigInt(slot.repairCost);
  const canStart = slot.state === "idle" && !slot.usedToday && !me.miningHalted;
  const canCollect = slot.state === "mining" || slot.state === "ready";
  const readyIn = slot.session ? Date.parse(slot.session.endsAt) - now : 0;

  const start = () =>
    act("start", () => api(`/api/slots/${slot.id}/start`, { body: {} }), () => "Session started. Collect any time — the server keeps the clock.");
  const collect = () =>
    act(
      "collect",
      () => api<{ reward: string; ore: Record<OreId, number>; broken: boolean; poolExhausted: boolean }>(`/api/slots/${slot.id}/collect`, { body: {} }),
      (d) => {
        setCollectFx({ nonce: Date.now(), amount: fmt(d.reward) });
        const ores = Object.entries(d.ore)
          .filter(([, n]) => n > 0)
          .map(([k]) => ORE_LABELS[k as OreId]);
        return `Collected ${fmt(d.reward)} $ZGEMS into your in-game balance${ores.length ? ` and found ${ores.join(", ")}` : ""}.${
          d.broken ? " Your pickaxe broke — repair it before the next session." : ""
        }`;
      },
    );
  const upgrade = () =>
    act(
      "upgrade",
      () => api<{ level: number }>(`/api/slots/${slot.id}/upgrade`, { body: {}, idempotencyKey: newIdempotencyKey("upg") }),
      (d) => `Upgraded to level ${d.level}. Durability restored.`,
    );
  const repair = () =>
    act(
      "repair",
      () => api<{ readyAt: string }>(`/api/slots/${slot.id}/repair`, { body: {}, idempotencyKey: newIdempotencyKey("rep") }),
      (d) => `Repair paid. The slot can mine again at ${new Date(d.readyAt).toUTCString().slice(17, 22)} UTC.`,
    );
  const daily = () =>
    act("daily", () => api<{ amount: string; streak: number }>("/api/daily/claim", { body: {} }), (d) => `Daily reward: ${fmt(d.amount)} $ZGEMS (streak ${d.streak}).`);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black px-[18px] py-3.5">
          <div>
            <Label className="tracking-[2px]">SLOT 01 · {slot.name.toUpperCase()}</Label>
            <div className="font-pixel text-[26px]">Level {slot.level} miner</div>
          </div>
          <div className={cx("border-3 border-black px-2.5 py-1 font-pixel text-[17px]", badgeClass)}>{badge}</div>
        </div>
        <div className="relative aspect-[16/9] border-b-3 border-black bg-[linear-gradient(160deg,#2A2109_0%,#0E0B08_75%)]">
          {sceneMode === "game" ? (
            <MineScene scene={{ state: slot.state, level: slot.level, collect: collectFx, doneToday }} className="absolute inset-0" />
          ) : (
            <LazyVideo clip="mine-loop" eager label="Mine loop" className={cx("absolute inset-0 h-full", slot.state !== "mining" && "opacity-45")} />
          )}
          <button
            type="button"
            onClick={() => setSceneMode((m) => (m === "game" ? "clip" : "game"))}
            className="absolute bottom-2 right-2 border-3 border-black bg-ink/90 px-2 py-0.5 text-[11px] uppercase tracking-[1px] text-khaki hover:text-cream"
          >
            {sceneMode === "game" ? "Show clip" : "Show game"}
          </button>
        </div>
        <div className="p-[18px]">
          <div className="flex justify-between text-xs tracking-[1px] text-khaki">
            <span>
              SESSION · {acc.hours.toFixed(1)} / {me.config.sessionHours} H
            </span>
            <span>
              {slot.state === "mining" && readyIn > 0 ? `READY IN ${formatCountdown(readyIn).replace(/^0d /, "")}` : `${Math.round(acc.pct)}%`}
            </span>
          </div>
          <div className="mt-2 h-[22px] border-3 border-black bg-ink">
            <div
              className={cx("h-full progress-stripes", slot.state === "mining" && "animate-stripe")}
              style={{ width: `${acc.pct}%`, backgroundSize: "32px 100%" }}
            />
          </div>
          <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
            <Well className="p-3">
              <Label>MINED THIS SESSION</Label>
              <div className="font-pixel text-2xl text-gold-hi">{fmt(acc.amount.toString())}</div>
            </Well>
            <Well className="p-3">
              <Label>RATE</Label>
              <div className="font-pixel text-2xl">{slot.ratePerHour} / h</div>
            </Well>
            <Well className="p-3">
              <Label>PICKAXE</Label>
              <div className={cx("font-pixel text-2xl", slot.durability <= 2 ? "text-ember" : "text-cream")}>
                {slot.pickaxeEnabled ? `${slot.durability} / ${slot.durabilityMax}` : "∞"}
              </div>
            </Well>
          </div>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <Button onClick={start} disabled={!canStart || busy !== null}>
              {busy === "start" ? "Starting…" : "Start mining"}
            </Button>
            <Button variant="moss" onClick={collect} disabled={!canCollect || busy !== null}>
              {busy === "collect" ? "Collecting…" : "Collect"}
            </Button>
            <Button
              variant="dark"
              onClick={upgrade}
              disabled={!canAffordUpgrade || slot.state === "mining" || slot.state === "ready" || busy !== null}
              title={slot.upgradeCost !== null && !canAffordUpgrade ? "Not enough $ZGEMS yet" : undefined}
            >
              Upgrade · {slot.upgradeCost === null ? "MAX" : fmt(slot.upgradeCost)}
            </Button>
            <Button variant="dark" onClick={repair} disabled={slot.state !== "broken" || !canAffordRepair || busy !== null}>
              Repair · {fmt(slot.repairCost)}
            </Button>
          </div>
          <div
            className={cx("mt-3 min-h-5 text-[13px]", notice?.kind === "bad" ? "text-ember" : "text-moss")}
            role="status"
            aria-live="polite"
          >
            {notice?.text ??
              (slot.state === "idle" && slot.usedToday
                ? `Today's session is used. Next reset in ${formatCountdown(Date.parse(slot.nextResetAt) - now).replace(/^0d /, "")} (00:00 UTC).`
                : slot.state === "repairing" && slot.brokenUntil
                  ? `Repair finishes in ${formatCountdown(Date.parse(slot.brokenUntil) - now).replace(/^0d /, "")}.`
                  : me.miningHalted
                    ? "The mining pool is empty, so mining has stopped. No new tokens are ever minted."
                    : "")}
          </div>
          <FinePrint className="mt-1.5">
            One session per slot per day, reset at 00:00 UTC. Collecting early ends today&apos;s session and banks what you mined. The number above is an estimate;
            every amount is computed on the server.
          </FinePrint>
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel className="p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label className="tracking-[2px]">DAILY REWARD</Label>
              <div className="font-pixel text-2xl">
                Streak {me.daily.streak} / {me.daily.streakMax}
              </div>
            </div>
            <Button size="sm" onClick={daily} disabled={me.daily.claimedToday || !me.pass || me.pass.status !== "active" || busy !== null}>
              {me.daily.claimedToday ? "Claimed" : `Claim ${fmt(me.daily.nextAmount)}`}
            </Button>
          </div>
          <div className="mt-3.5 flex gap-1.5">
            {Array.from({ length: me.daily.streakMax }, (_, i) => (
              <span key={i} className={cx("h-4 flex-1 border-3 border-black", i < me.daily.streak ? "bg-moss" : "bg-ink")} />
            ))}
          </div>
          <FinePrint className="mt-3">Base reward plus 10% per day of streak, up to seven days. Resets if you miss a UTC day. Pass holders only.</FinePrint>
        </Panel>

        <OrePanel inventory={inventory} game={game} />

        <Panel tone="coal-2" className="p-[18px]">
          <Label className="tracking-[2px]">THIS WEEK</Label>
          <div className="mt-3 grid gap-2.5">
            <Row label="Queued for payout">
              <strong className="font-pixel text-[19px] font-normal text-gold-hi">{fmt(me.nextPayout.queued)} $ZGEMS</strong>
            </Row>
            <Row label="Cutoff">
              <strong className="font-pixel text-[19px] font-normal">{formatCountdown(Date.parse(me.nextPayout.cutoffAt) - now)}</strong>
            </Row>
            <Row label="Destination">
              <strong className="text-[13px] font-normal text-moss">{short(me.nextPayout.destination, 10, 8)}</strong>
            </Row>
            <Row label="Minimum">
              <span className="text-[13px]">{fmt(me.nextPayout.minimum)} $ZGEMS</span>
            </Row>
          </div>
          <FinePrint className="mt-3">
            Spend before the cutoff if you want to: whatever is left is sent to your pass address in the weekly batch. Balances under the minimum roll into the next
            week.
          </FinePrint>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b-3 border-black px-[18px] py-3 font-pixel text-[22px]">How your rate is built</div>
          <div className="flex bg-gold">
            <LazyVideo clip="rate-explainer" label="Rate example clip" className="aspect-video" />
          </div>
          <FinePrint className="px-[18px] py-3">
            Base rate × level multiplier × hours mined, capped at {me.config.sessionHours}. The rate in the clip is an example; your live rate is in the panel.
          </FinePrint>
        </Panel>
      </div>
    </div>
  );
}

function OrePanel({ inventory, game }: { inventory: InventoryItem[]; game: ReturnType<typeof useGame> }) {
  const exchange = (item: OreId, qty: number) =>
    game.act(
      `ex-${item}`,
      () => api<{ received: string }>("/api/shop/exchange", { body: { item, qty }, idempotencyKey: newIdempotencyKey("ex") }),
      (d) => `Exchanged ${qty} ${ORE_LABELS[item]} for ${fmt(d.received)} $ZGEMS.`,
    );
  return (
    <Panel className="p-[18px]">
      <Label className="tracking-[2px]">ORE INVENTORY · SHOP</Label>
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
        {inventory.map((o) => (
          <Well key={o.item} className="grid gap-2 p-2.5">
            <div className="flex items-center gap-2.5">
              <span className={cx("size-4 flex-none border-3 border-black", ORE_COLOR[o.item])} />
              <div className="min-w-0">
                <div className="truncate text-xs text-dust">{ORE_LABELS[o.item]}</div>
                <div className="font-pixel text-xl">{o.qty}</div>
              </div>
            </div>
            <button
              type="button"
              disabled={o.qty < 1 || o.exchangeRate === "0" || game.busy !== null}
              onClick={() => exchange(o.item, o.qty)}
              className="cursor-pointer border-3 border-black bg-coal px-2 py-0.5 text-[11px] text-khaki hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sell all · {o.exchangeRate}/ea
            </button>
          </Well>
        ))}
      </div>
      <FinePrint className="mt-3">Ore is game inventory, not a token. Exchange rates are set in the shop config and paid from the mining pool.</FinePrint>
    </Panel>
  );
}

export type { Me };
