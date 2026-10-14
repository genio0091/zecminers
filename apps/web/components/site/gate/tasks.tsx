"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import type { GateTask } from "@/lib/waitlist";
import { Turnstile, turnstileEnabled } from "../../turnstile";
import { cx } from "../../ui";
import { PixelMark } from "../logo";
import { XLogo } from "./step-one";

const actionButton =
  "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-3 border-black bg-night px-4 py-2 font-pixel text-xl leading-none text-gold shadow-[4px_4px_0_#6B4A12] hover:text-gold-hi disabled:opacity-60";

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <path d="M1 6h2v2h2v-2h2v-2h2v-2h2v2h-2v2h-2v2h-2v2h-2v-2h-2z" fill="currentColor" />
    </svg>
  );
}

function DoneBadge({ verified }: { verified: boolean }) {
  return (
    <span
      title={verified ? "Proven by X sign-in" : "Recorded from your click. Reviewed before the allowlist is final."}
      className={cx(
        "inline-flex flex-none animate-rise items-center gap-1.5 border-2 border-night px-2.5 py-1 font-mono text-[11px] font-bold tracking-[1.5px]",
        verified ? "bg-moss text-night" : "bg-paper-line text-umber",
      )}
    >
      <Check />
      {verified ? "VERIFIED" : "MARKED"}
    </span>
  );
}

function WalletRow({ task, onSaved }: { task: GateTask; onSaved: () => void }) {
  const [editing, setEditing] = useState(!task.done);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) return setError("That doesn't look like a wallet address. It should start with 0x followed by 40 characters.");
    setBusy(true);
    const res = await api("/api/waitlist/wallet", { body: { address: value.trim() } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setEditing(false);
    onSaved();
  }
  if (!editing) {
    return (
      <div className="flex flex-none items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="cursor-pointer font-mono text-[11px] tracking-[1px] text-umber underline">
          change
        </button>
        <DoneBadge verified={false} />
      </div>
    );
  }
  return (
    <form onSubmit={save} noValidate className="col-span-3 mt-3 grid w-full gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="0x…"
          aria-label="Wallet address on Robinhood Chain"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 border-3 border-night bg-white/70 px-3 py-2 font-mono text-sm tracking-normal text-night placeholder:text-stone"
        />
        <button type="submit" disabled={busy} className={actionButton}>
          {busy ? "SAVING…" : "SAVE"}
        </button>
      </div>
      {error ? <div className="text-[12.5px] font-semibold text-[#B3361B]">{error}</div> : null}
    </form>
  );
}

/** The waitlist task list: numbered rows, an honest Verified/Marked badge on each, then consent and the unlock. */
export function GateTasks({ tasks, consent: initialConsent, done, total }: { tasks: GateTask[]; consent: boolean; done: number; total: number }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [consent, setConsent] = useState(initialConsent);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [granted, setGranted] = useState<number | null>(null);
  const allDone = done === total;
  const refresh = () => router.refresh();

  async function attest(task: GateTask) {
    if (task.url) window.open(task.url, "_blank", "noopener,noreferrer");
    setBusyKey(task.key);
    setError("");
    const res = await api("/api/waitlist/task", { body: { key: task.key } });
    setBusyKey(null);
    if (!res.ok) return setError(res.error.message);
    refresh();
  }

  async function toggleConsent(next: boolean) {
    setConsent(next);
    const res = await api("/api/waitlist/consent", { body: { agreed: next } });
    if (!res.ok) {
      setConsent(!next);
      setError(res.error.message);
    }
  }

  async function enter() {
    if (turnstileEnabled && !token) return setError("Complete the human check first.");
    setBusyKey("enter");
    setError("");
    const res = await api<{ memberNo: number | null }>("/api/waitlist/enter", { body: { turnstileToken: token } });
    if (!res.ok) {
      setBusyKey(null);
      return setError(res.error.message);
    }
    setGranted(res.data.memberNo ?? 0);
    // Let the stamp land before the full site appears.
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1900);
  }

  const pct = Math.round((done / Math.max(1, total)) * 100);
  const canEnter = allDone && consent && busyKey === null;

  return (
    <>
      <section className="w-full border-3 border-night bg-cream p-5 shadow-[8px_8px_0_#1A1208] sm:p-6">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="m-0 font-pixel text-[26px] font-normal leading-none tracking-[.5px]">WAITLIST TASKS</h2>
          <span className="font-mono text-xs font-bold tracking-[1px] text-umber">
            {done} / {total} COMPLETE
          </span>
        </div>
        <div className="mb-4 h-4 border-3 border-night bg-paper-line" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Tasks complete">
          <div className="h-full animate-stripe stripes-gold transition-[width] duration-500 [background-size:40px_100%]" style={{ width: `${pct}%` }} />
        </div>

        <ol className="m-0 list-none p-0">
          {tasks.map((t, i) => (
            <li key={t.key} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3.5 border-t-2 border-dashed border-paper-line px-1 py-3.5 first:border-t-0">
              <span
                aria-hidden
                className={cx(
                  "grid size-[34px] place-items-center border-3 border-night font-pixel text-xl leading-none",
                  t.done ? "bg-moss text-night" : "bg-gold text-night",
                )}
              >
                {t.done ? <Check /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold leading-tight">{t.title}</div>
                <div className="mt-0.5 break-words text-[12.5px] text-umber">{t.desc}</div>
              </div>
              {t.kind === "wallet" ? (
                <WalletRow task={t} onSaved={refresh} />
              ) : t.done ? (
                <DoneBadge verified={t.verified} />
              ) : t.kind === "connect_x" ? (
                <a href="/api/waitlist/x/start" className={actionButton}>
                  <XLogo size={14} />
                  Connect
                </a>
              ) : (
                <button type="button" disabled={busyKey !== null} onClick={() => attest(t)} className={actionButton}>
                  {busyKey === t.key ? "SAVING…" : t.action}
                </button>
              )}
            </li>
          ))}
        </ol>

        <p className="mb-0 mt-2 text-[11.5px] leading-[1.5] text-umber">
          <strong className="text-night">VERIFIED</strong> tasks are proven by X sign-in. <strong className="text-night">MARKED</strong> tasks are recorded from your
          click and reviewed before the allowlist is final.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-[1.5] text-umber-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => toggleConsent(e.target.checked)}
            className="mt-0.5 size-[17px] flex-none cursor-pointer accent-night"
          />
          <span>
            I agree to Hood Valley processing my public X profile and the wallet address I enter for the waitlist, mint allowlist checks and holder rewards.
            Hood Valley will never ask for my seed phrase or private key.
          </span>
        </label>

        <div className="mt-4">
          <Turnstile onToken={setToken} />
        </div>

        <button
          type="button"
          onClick={enter}
          disabled={!canEnter}
          className={cx(
            "mt-3 w-full border-3 py-3.5 font-pixel text-[32px] leading-none tracking-[.5px] transition-[transform,box-shadow] duration-100",
            canEnter
              ? "cursor-pointer border-black bg-night text-gold shadow-[6px_6px_0_#6B4A12] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-gold-hi hover:shadow-[8px_8px_0_#6B4A12]"
              : "cursor-not-allowed border-[#CBB996] bg-paper-line text-[#A8977A]",
          )}
        >
          {busyKey === "enter" ? "OPENING THE GATE…" : "ENTER THE VALLEY"}
        </button>
        <div role="alert" className="mt-2 min-h-5 text-center text-[13px] font-semibold text-[#B3361B]">
          {error || (!allDone ? `${total - done} ${total - done === 1 ? "task" : "tasks"} to go.` : !consent ? "Tick the consent box to continue." : "")}
        </div>
      </section>

      {granted !== null ? (
        <div className="fixed inset-0 z-80 flex flex-col items-center justify-center gap-7 bg-night/95 px-4 text-center" role="status">
          <span className="animate-float">
            <PixelMark size={104} className="shadow-[0_6px_0_#000]" />
          </span>
          <div className="animate-stamp border-[6px] border-double border-gold px-8 py-3 font-pixel text-[clamp(48px,9vw,72px)] leading-none tracking-[2px] text-gold">
            ACCESS GRANTED
          </div>
          <div className="font-mono text-sm tracking-[1px] text-sand">
            WELCOME TO HOOD VALLEY{granted ? ` · YOU'RE #${String(granted).padStart(4, "0")} IN LINE` : ""}
          </div>
        </div>
      ) : null}
    </>
  );
}
