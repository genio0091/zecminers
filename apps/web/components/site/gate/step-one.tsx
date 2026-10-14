"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { cx } from "../../ui";

export function XLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

const button =
  "inline-flex cursor-pointer items-center justify-center gap-3 border-3 border-black bg-night px-6 py-3.5 font-pixel text-[28px] leading-none text-gold shadow-[6px_6px_0_#6B4A12] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-gold-hi hover:shadow-[8px_8px_0_#6B4A12] disabled:opacity-60";

/**
 * Step 1: connect X. With X OAuth configured this is a plain link into the OAuth flow; without it
 * the visitor types their handle, and the task list marks it as self-reported.
 */
export function StepOneAction({ xEnabled, label = "CONNECT X TO BEGIN", dark = false }: { xEnabled: boolean; label?: string; dark?: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (xEnabled) {
    return (
      // A full navigation: the server redirects to X.
      <a href="/api/waitlist/x/start" className={cx(button, "hover:text-gold-hi")}>
        <XLogo />
        {label}
      </a>
    );
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!/^@?[A-Za-z0-9_]{1,15}$/.test(handle.trim())) return setError("Enter your X handle, like @yourhandle.");
    setBusy(true);
    setError("");
    const res = await api("/api/waitlist/start", { body: { handle: handle.trim() } });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error.message);
    }
    router.push("/waitlist");
    router.refresh();
  }

  return (
    <form onSubmit={start} noValidate className="mx-auto grid w-full max-w-[420px] gap-3">
      <label className={cx("grid gap-1.5 text-left font-mono text-[11px] tracking-[1.5px]", dark ? "text-khaki" : "text-umber")}>
        YOUR X HANDLE
        <input
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value);
            setError("");
          }}
          placeholder="@yourhandle"
          autoComplete="off"
          spellCheck={false}
          className="border-3 border-night bg-white/70 p-3 font-mono text-[15px] tracking-normal text-night placeholder:text-stone"
        />
      </label>
      <button type="submit" disabled={busy} className={button}>
        <XLogo />
        {busy ? "STARTING…" : "CONTINUE"}
      </button>
      <div role="alert" className={cx("min-h-5 text-sm font-semibold", dark ? "text-ember" : "text-[#B3361B]")}>
        {error}
      </div>
    </form>
  );
}
