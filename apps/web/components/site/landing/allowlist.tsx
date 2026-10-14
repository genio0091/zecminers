"use client";

import { useState } from "react";
import { ALLOWLIST_TASKS } from "@/lib/content";
import { api } from "@/lib/client-api";
import { Turnstile, turnstileEnabled } from "../../turnstile";
import { Wrap } from "./strata";

type TaskKey = (typeof ALLOWLIST_TASKS)[number]["key"];

const field = "border-3 border-clay bg-bedrock p-3 font-mono text-[15px] tracking-normal text-cream placeholder:text-stone";

function AllowlistForm() {
  const [tasks, setTasks] = useState<Record<TaskKey, boolean>>({ follow: false, discord: false, repost: false });
  const [handle, setHandle] = useState("");
  const [wallet, setWallet] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tasks.follow || !tasks.discord || !tasks.repost) return setError("Finish all three tasks first.");
    if (handle.trim().length < 2) return setError("Add the handle we should reach you on.");
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet.trim())) {
      return setError("That doesn't look like a wallet address. It should start with 0x followed by 40 characters.");
    }
    if (turnstileEnabled && !token) return setError("Complete the human check.");
    setBusy(true);
    setError("");
    const res = await api<{ joined: boolean; already: boolean }>("/api/waitlist", {
      body: { handle: handle.trim(), address: wallet.trim(), tasks, turnstileToken: token },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setJoined(handle.trim() || "you");
  }

  if (joined) {
    return (
      <div role="status">
        <div className="font-pixel text-[44px] leading-none text-moss">YOU&apos;RE ON THE LIST</div>
        <p className="mt-3 mb-0 text-dust">
          We&apos;ll reach {joined} when mint details are confirmed. Keep the wallet you entered: it&apos;s the one we&apos;ll check.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="font-mono text-[11px] tracking-[2px] text-khaki">THREE QUICK TASKS</div>
      <div className="mt-3 grid gap-2.5">
        {ALLOWLIST_TASKS.map((t) => {
          const done = tasks[t.key];
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={done}
              onClick={() => {
                setTasks((s) => ({ ...s, [t.key]: !s[t.key] }));
                setError("");
              }}
              className="flex w-full cursor-pointer items-center gap-3 border-3 border-clay bg-bedrock px-3.5 py-3 text-left font-sans text-[15px] text-cream hover:border-gold"
            >
              <span aria-hidden className="box-border block size-5 flex-none border-3 border-dust" style={{ background: done ? "#8BD05A" : "transparent" }} />
              <span className="flex-1">{t.label}</span>
              <span className={`font-mono text-[11px] tracking-[1px] ${done ? "text-moss" : "text-khaki"}`}>{done ? "DONE" : "TO DO"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-[18px] grid gap-3.5">
        <label className="grid gap-1.5 font-mono text-[11px] tracking-[1.5px] text-khaki">
          X HANDLE OR DISCORD NAME
          <input
            type="text"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setError("");
            }}
            placeholder="@yourhandle"
            autoComplete="off"
            className={field}
          />
        </label>
        <label className="grid gap-1.5 font-mono text-[11px] tracking-[1.5px] text-khaki">
          WALLET ADDRESS ON ROBINHOOD CHAIN (0x…)
          <input
            type="text"
            value={wallet}
            onChange={(e) => {
              setWallet(e.target.value);
              setError("");
            }}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            className={field}
          />
        </label>
        <Turnstile onToken={setToken} />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer border-3 border-black bg-gold px-5 py-3.5 font-pixel text-[30px] leading-none text-night shadow-[5px_5px_0_#000] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gold-hi hover:shadow-[7px_7px_0_#000] disabled:opacity-60"
        >
          {busy ? "JOINING…" : "JOIN THE ALLOWLIST"}
        </button>
        <div role="alert" className="min-h-5 text-sm text-ember">
          {error}
        </div>
      </div>
    </form>
  );
}

/** Claim your spot: the mint allowlist. */
export function Allowlist() {
  return (
    <section id="allowlist" aria-labelledby="allow-title" className="bg-bedrock pb-24 pt-10">
      <Wrap>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-10 border-4 border-black bg-gold p-[clamp(24px,4vw,48px)] text-night shadow-[14px_14px_0_#3A2614]">
          <div>
            <div className="font-mono text-xs font-bold tracking-[2px]">09 · ALLOWLIST</div>
            <h2 id="allow-title" className="mt-3.5 mb-0 font-pixel text-[clamp(54px,6.6vw,100px)] font-normal leading-[.88] tracking-[.5px]">
              CLAIM YOUR SPOT IN THE VALLEY
            </h2>
            <p className="mt-5 mb-0 max-w-[520px] text-[17px] text-umber-3 text-pretty">
              Whitelist and public mint dates, and the pricing tiers, are announced before public release. Get on the list to hear first.
            </p>
            <p className="mt-4 mb-0 max-w-[520px] text-sm font-semibold text-umber-3">Hood Valley will never ask for your seed phrase or private key.</p>
          </div>
          <div className="border-3 border-black bg-night p-6 text-cream">
            <AllowlistForm />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
