"use client";

import { useState } from "react";
import { api } from "@/lib/client-api";
import { Turnstile, turnstileEnabled } from "../turnstile";
import { Button, cx } from "../ui";

const TASKS = [
  ["follow", "Follow @ZecMiners on X"],
  ["retweet", "Retweet the pinned launch post"],
  ["tweet", "Post your t1 address with #ZecMiners"],
] as const;
type TaskKey = (typeof TASKS)[number][0];

export function WaitlistForm() {
  const [tasks, setTasks] = useState<Record<TaskKey, boolean>>({ follow: false, retweet: false, tweet: false });
  const [handle, setHandle] = useState("");
  const [address, setAddress] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tasks.follow || !tasks.retweet || !tasks.tweet) return setError("Finish all three tasks first.");
    if (handle.trim().length < 2) return setError("Add the handle we should message.");
    if (!/^t1[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(address.trim())) return setError("That does not look like a transparent t1 address.");
    if (turnstileEnabled && !token) return setError("Complete the human check.");
    setBusy(true);
    setError("");
    const res = await api<{ joined: boolean; already: boolean }>("/api/waitlist", {
      body: { handle: handle.trim(), address: address.trim(), tasks, turnstileToken: token },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setJoined(handle.trim());
  }

  if (joined) {
    return (
      <div>
        <div className="font-pixel text-[30px] text-moss">You&apos;re on the list</div>
        <p className="mt-2.5 text-sm text-dust">
          We&apos;ll message {joined} if your address is drawn. Keep the address you entered in a ZRC-20 wallet: that is where the pass is sent, and where
          every payout goes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="text-[11px] uppercase tracking-[2px] text-khaki">Three tasks</div>
      <div className="mt-3 grid gap-2.5">
        {TASKS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={tasks[key]}
            onClick={() => {
              setTasks((t) => ({ ...t, [key]: !t[key] }));
              setError("");
            }}
            className="flex w-full cursor-pointer items-center gap-3 border-3 border-black bg-ink px-3.5 py-3 text-left text-sm text-cream shadow-px-3 hover:bg-coal-hover"
          >
            <span className={cx("size-5 flex-none border-3 border-black", tasks[key] ? "bg-moss" : "bg-ink")} />
            <span className="flex-1">{label}</span>
            <span className="text-[11px] tracking-[1px] text-khaki">{tasks[key] ? "DONE" : "TODO"}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        <label className="grid gap-1.5 text-xs uppercase tracking-[1.5px] text-khaki">
          X handle or Discord name
          <input
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setError("");
            }}
            placeholder="@yourhandle"
            autoComplete="off"
            className="border-3 border-black bg-ink px-3 py-2.5 text-[15px] normal-case tracking-normal text-cream"
          />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[1.5px] text-khaki">
          Transparent address (t1…)
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError("");
            }}
            placeholder="t1…"
            autoComplete="off"
            spellCheck={false}
            className="border-3 border-black bg-ink px-3 py-2.5 text-[15px] normal-case tracking-normal text-cream"
          />
        </label>
        <Turnstile onToken={setToken} />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Joining…" : "Join the waitlist"}
        </Button>
        <div className="min-h-[18px] text-[12.5px] text-ember" role="alert">
          {error}
        </div>
        <p className="m-0 text-xs text-stone">
          Use a ZRC-20 wallet such as Zatoshi Wallet. Ordinary Zcash wallets can spend the coin that carries your pass and destroy it.
        </p>
      </div>
    </form>
  );
}
