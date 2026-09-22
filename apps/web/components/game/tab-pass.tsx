"use client";

import { useState } from "react";
import { api, short } from "@/lib/client-api";
import { LazyVideo } from "../lazy-video";
import { Turnstile, turnstileEnabled } from "../turnstile";
import { Button, FinePrint, Label, Panel, Well, cx } from "../ui";
import type { useGame } from "./use-game";

function ago(iso: string | null) {
  if (!iso) return "not yet";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return m < 1 ? "just now" : m < 90 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

export function PassTab({ game }: { game: ReturnType<typeof useGame> }) {
  const { me } = game;
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!me) return null;
  const pass = me.pass;

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!/^t1[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(address.trim())) return setMsg({ ok: false, text: "That is not a valid transparent t1 address." });
    if (code.trim().length < 8) return setMsg({ ok: false, text: "Enter the claim code from your airdrop message." });
    if (turnstileEnabled && !token) return setMsg({ ok: false, text: "Complete the human check." });
    const res = await game.act("link", () =>
      api("/api/wallet/link", { body: { address: address.trim(), claimCode: code.trim(), turnstileToken: token } }),
    );
    setMsg(res.ok ? { ok: true, text: "Address linked. Your slot is ready, and payouts will go here." } : { ok: false, text: res.error.message });
  }

  const statusColor = pass?.status === "active" ? "text-moss" : pass?.status === "moved" ? "text-ember" : "text-khaki";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] items-start gap-5">
      <Panel className="p-[22px]">
        <Label className="tracking-[2px]">WHITELIST PASS</Label>
        {pass ? (
          <div>
            <div className="mb-4 mt-1.5 font-pixel text-[30px]">
              {pass.status === "active" ? "Linked and mining" : pass.status === "moved" ? "Pass moved — slot stopped" : "Pass inactive"}
            </div>
            <div className="grid gap-2.5 text-[13px]">
              <Well className="p-3">
                <Label>PASS · INSCRIPTION</Label>
                <div className="truncate">
                  #{String(pass.passNumber).padStart(4, "0")} · {pass.inscriptionId ? short(pass.inscriptionId, 10, 8) : "inscription id recorded after the airdrop"}
                </div>
              </Well>
              <Well className="p-3">
                <Label>ORIGIN ADDRESS · PAYOUTS GO HERE</Label>
                <div className="break-all text-moss">{pass.originAddress}</div>
              </Well>
              <Well className="flex flex-wrap justify-between gap-3 p-3">
                <span className="text-khaki">Owner check</span>
                <span className={pass.status === "moved" ? "text-ember" : "text-moss"}>
                  {pass.status === "moved" ? `Now at ${short(pass.lastSeenOwner, 8, 6)}` : "Matches"} · checked {ago(pass.lastOwnerCheckAt)}
                </span>
              </Well>
              <Well className="flex flex-wrap justify-between gap-3 p-3">
                <span className="text-khaki">Status</span>
                <span className={statusColor}>{pass.status.toUpperCase()}</span>
              </Well>
            </div>
            {pass.status === "moved" ? (
              <p className="mb-0 mt-3 text-[13px] text-dust">
                Soulbound rule: the pass left the address it was airdropped to, so this slot stopped permanently. Any remaining in-game balance is paid one last time
                to the origin address.
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={link} noValidate>
            <div className="mb-2 mt-1.5 font-pixel text-[30px]">Link your pass</div>
            <p className="mb-4 mt-0 text-[13px] text-dust">
              Enter the address the pass was airdropped to, plus the one-time claim code from your airdrop message. One address links to one account.
            </p>
            <div className="grid gap-3.5">
              <label className="grid gap-1.5 text-[11px] tracking-[1.5px] text-khaki">
                TRANSPARENT ADDRESS
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setMsg(null);
                  }}
                  placeholder="t1…"
                  spellCheck={false}
                  autoComplete="off"
                  className="border-3 border-black bg-ink px-3 py-2.5 text-sm tracking-normal text-cream"
                />
              </label>
              <label className="grid gap-1.5 text-[11px] tracking-[1.5px] text-khaki">
                CLAIM CODE
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setMsg(null);
                  }}
                  placeholder="ZM-XXXX-XXXX"
                  spellCheck={false}
                  autoComplete="off"
                  className="border-3 border-black bg-ink px-3 py-2.5 text-sm tracking-normal text-cream"
                />
              </label>
              <Turnstile onToken={setToken} />
              <Button type="submit" disabled={game.busy !== null}>
                {game.busy === "link" ? "Verifying…" : "Verify and link"}
              </Button>
              <div className={cx("min-h-5 text-[13px]", msg?.ok ? "text-moss" : "text-ember")} role="status">
                {msg?.text}
              </div>
            </div>
            <FinePrint className="mt-2">
              Never share your seed phrase. ZecMiners will never ask for it — the claim code is all we need. Local demo: see the README for dev claim codes.
            </FinePrint>
          </form>
        )}
      </Panel>
      <div className="grid gap-5">
        <Panel tone="gold" className="overflow-hidden">
          <LazyVideo clip="zandy-pass" label="Zandy, the starter miner" className="aspect-[16/10]" />
        </Panel>
        <Panel tone="coal-2" className="p-[18px]">
          <div className="mb-2.5 font-pixel text-2xl">Soulbound by rule</div>
          <ul className="m-0 grid gap-2 pl-[18px] text-[13px] text-dust">
            <li>The pass only mines at the address it was airdropped to.</li>
            <li>An hourly check compares the on-chain owner against that address. If it moved, the slot stops permanently.</li>
            <li>Payouts always go to the origin address. There is no change-address feature.</li>
            <li>Keep it in a ZRC-20 wallet such as Zatoshi Wallet. Wallets that are not inscription-aware can destroy it.</li>
          </ul>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b-3 border-black px-[18px] py-3 font-pixel text-[22px]">Traits your miner can roll</div>
          <div className="flex bg-gold">
            <LazyVideo clip="traits" label="Trait list" />
          </div>
          <div className="grid grid-cols-2 border-t-3 border-black">
            <div className="border-r-3 border-black bg-dirt">
              <LazyVideo clip="miner-cave" label="Cave miner" className="aspect-square" />
            </div>
            <div className="bg-amber-deep">
              <LazyVideo clip="miner-sun" label="Surface miner" className="aspect-square" />
            </div>
          </div>
          <FinePrint className="px-[18px] py-3">
            Helmets, tools, gems, ores and backgrounds. Traits arrive with the Phase 2 Miners mint; your pass keeps the starter Zandy.
          </FinePrint>
        </Panel>
      </div>
    </div>
  );
}
