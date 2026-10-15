"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { api } from "@/lib/client-api";
import type { ClaimView } from "@/lib/waitlist";
import { Turnstile, turnstileEnabled } from "../../turnstile";
import { cx } from "../../ui";
import { PixelMark } from "../logo";
import { NUMBER_WORDS, PixelCheck, StampBadge, monoLabel, permitNo, shortWallet } from "./bits";
import { Permit, type PermitData } from "./permit";

export interface ClaimNotices {
  x: string | null;
  discord: string | null;
}

const navLink =
  "block border-2 border-umber px-[13px] py-[9px] font-mono text-xs tracking-[1.5px] text-cream hover:border-gold hover:text-gold max-[720px]:hidden";
const goldButton =
  "cursor-pointer border-3 border-night bg-gold font-pixel leading-none text-night shadow-[4px_4px_0_#1A1208] hover:bg-gold-hi disabled:cursor-wait disabled:opacity-70";
const h1Class = "m-0 font-pixel text-[76px] font-normal leading-[.86] tracking-[.5px] outline-none max-[720px]:text-[54px]";
const card = "border-3 border-night bg-permit shadow-[8px_8px_0_#1A1208]";
const pad = "px-[22px] max-[720px]:px-4";

/**
 * The Claim Office: the waitlist in front of the Field Journal. Connect X, collect a stamp for
 * each task, consent and file the claim. Every step is saved on the server; this component only
 * presents it and calls the waitlist API.
 */
export function ClaimOffice({
  view,
  siteOpen,
  notices,
  links,
}: {
  view: ClaimView;
  siteOpen: boolean;
  notices: ClaimNotices;
  links: { x: string | null; discord: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startRefresh] = useTransition();
  const refresh = () => startRefresh(() => router.refresh());

  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filing, setFiling] = useState(false);

  // New screen: back to the top and focus its heading.
  const h1 = useRef<HTMLHeadingElement>(null);
  const shown = useRef(view.screen);
  useEffect(() => {
    if (shown.current === view.screen) return;
    shown.current = view.screen;
    window.scrollTo(0, 0);
    h1.current?.focus({ preventScroll: true });
    setFiling(false);
  }, [view.screen]);

  const connected = view.screen !== "gate";
  const filed = view.screen === "filed";
  const socialDone = (key: string, done: boolean) => done || !!marked[key];
  const dc = view.discord;
  const dcDone = !!dc && (dc.oauth ? dc.member : dc.marked || !!marked.discord);

  const stamps = [
    { short: "X", verified: view.xVerified, done: connected },
    ...view.social.map((t) => ({ short: t.stamp, verified: false, done: connected && socialDone(t.key, t.done) })),
    ...(dc ? [{ short: "DISCORD", verified: dc.oauth, done: connected && dcDone }] : []),
  ];
  const total = stamps.length;
  const count = stamps.filter((s) => s.done).length;
  const allDone = count === total;

  const permit: PermitData = {
    no: permitNo(view.memberNo),
    handle: view.who,
    discord: dc
      ? dc.oauth
        ? dc.member
          ? { text: `@${dc.username}`, tone: "ink" }
          : dc.linked
            ? { text: "Not in server yet", tone: "warn" }
            : { text: "Not connected", tone: "faded" }
        : dcDone
          ? { text: "Marked as joined", tone: "ink" }
          : { text: "Not joined yet", tone: "faded" }
      : null,
    wallet: view.wallet ? shortWallet(view.wallet) : null,
    walletHint: filed ? "Not linked yet" : "Linked after filing",
    status: filed ? "FILED · ON THE ALLOWLIST" : !connected ? "NOT STARTED" : allDone ? "READY TO FILE" : `${count} OF ${total} STAMPS`,
    statusOk: filed || (connected && allDone),
    stamps,
    filed,
  };

  async function mark(key: string, url?: string) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setBusy(key);
    setError("");
    const res = await api("/api/waitlist/task", { body: { key } });
    setBusy(null);
    if (!res.ok) return setError(res.error.message);
    setMarked((m) => ({ ...m, [key]: true }));
    refresh();
  }

  async function signOut() {
    setBusy("signout");
    await api("/api/waitlist/signout", { body: {} });
    setBusy(null);
    if (pathname === "/") refresh();
    else router.push("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-office bg-[radial-gradient(circle,rgba(122,82,0,.17)_1px,transparent_1.6px)] bg-[length:22px_22px] leading-[1.55] text-night [color-scheme:light] [&_:focus-visible]:outline-ink-blue">
      <header className="border-b-3 border-black bg-night text-cream">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3 max-[720px]:px-4 max-[720px]:py-2.5">
          <Link href="/" aria-label="Hood Valley website" className="flex flex-none items-center gap-2.5 text-cream hover:text-cream">
            <PixelMark size={32} />
            <span className="font-pixel text-[28px] leading-none tracking-[1px]">HOOD VALLEY</span>
          </Link>
          <span className="whitespace-nowrap border-l-2 border-umber pl-3.5 font-mono text-[11px] tracking-[2px] text-gold max-[380px]:hidden">THE CLAIM OFFICE</span>
          <nav aria-label="Site" className="ml-auto flex gap-2.5">
            {siteOpen ? (
              <Link href="/" className={navLink}>
                WEBSITE
              </Link>
            ) : null}
            <Link href="/litepaper" className={navLink}>
              LITEPAPER
            </Link>
            <Link href="/play" className={navLink}>
              VALLEY HQ
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto box-border flex w-full max-w-[1200px] flex-1 flex-row-reverse flex-wrap content-center items-start gap-11 px-6 pb-14 pt-10 max-[720px]:gap-10 max-[720px]:px-4 max-[720px]:pb-11 max-[720px]:pt-7">
        <section aria-label="Waitlist" className="min-w-0 flex-[999_1_540px]">
          {view.screen === "gate" ? (
            <GateScreen view={view} notice={notices.x} h1={h1} total={total} />
          ) : view.screen === "tasks" ? (
            <div className="grid animate-rise gap-[22px]">
              <div className="grid gap-2.5">
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 font-mono text-[11.5px] tracking-[1.5px] text-ink-link">
                  <span>SIGNED IN AS {view.who?.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={busy === "signout"}
                    className="cursor-pointer border-0 border-b-2 border-night bg-transparent p-0 pb-px font-mono text-[11.5px] font-bold tracking-[1.5px] text-night hover:border-ink-link hover:text-ink-link"
                  >
                    SIGN OUT
                  </button>
                </div>
                <h1 ref={h1} tabIndex={-1} className={h1Class}>
                  ALMOST IN
                  <br />
                  THE VALLEY
                </h1>
                <p className="m-0 text-lg text-umber-3">Finish the tasks to stamp your permit, then file your claim.</p>
              </div>

              <div className={card}>
                <div className={cx(pad, "grid gap-3 border-b-3 border-night pb-4 pt-[18px]")}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="m-0 font-pixel text-[32px] font-normal leading-none">WAITLIST TASKS</h2>
                    <span aria-live="polite" className="font-mono text-xs font-bold tracking-[1.5px]">
                      {count} / {total} STAMPS
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Waitlist progress"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={count}
                    className="grid gap-[5px]"
                    style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
                  >
                    {stamps.map((s, i) => (
                      <span key={i} className={cx("block h-3.5 border-2 transition-colors duration-200", s.done ? "border-night bg-gold" : "border-rule bg-permit")} />
                    ))}
                  </div>
                </div>

                <ol className="m-0 list-none p-0">
                  <TaskRow n={1} done title="Connect your X account" sub={view.xVerified ? `Signed in as ${view.who} · verified by X` : `${view.who} · checked before the allowlist is final`}>
                    <StampBadge verified={view.xVerified} />
                  </TaskRow>
                  {view.social.map((t, i) => {
                    const done = socialDone(t.key, t.done);
                    return (
                      <TaskRow key={t.key} n={i + 2} done={done} title={t.title} sub={t.sub}>
                        {done ? (
                          <StampBadge verified={false} />
                        ) : (
                          <button type="button" disabled={busy !== null} onClick={() => mark(t.key, t.url)} className={cx(goldButton, "min-w-[132px] px-4 py-[9px] text-2xl")}>
                            {busy === t.key ? "OPENING X…" : t.btn}
                          </button>
                        )}
                      </TaskRow>
                    );
                  })}
                  {dc ? (
                    <DiscordRow
                      n={view.social.length + 2}
                      discord={dc}
                      done={dcDone}
                      who={view.who}
                      notice={notices.discord}
                      busy={busy}
                      onMark={() => mark("discord")}
                    />
                  ) : null}
                </ol>

                <FileClaim
                  consent={view.consent}
                  allDone={allDone}
                  total={total}
                  busy={busy}
                  setBusy={setBusy}
                  error={error}
                  setError={setError}
                  onFiled={() => {
                    setFiling(true);
                    // Let the stamp land, then show the filed permit (the overlay lifts when it arrives).
                    setTimeout(refresh, 1700);
                    setTimeout(() => setFiling(false), 8000);
                  }}
                />
              </div>
            </div>
          ) : (
            <FiledScreen view={view} h1={h1} onChanged={refresh} />
          )}
        </section>

        <Permit permit={permit} />
      </main>

      <div aria-hidden className="h-[9px] border-t-3 border-night bg-moss shadow-[inset_0_-3px_0_#5E9A3A]" />
      <footer className="bg-rock text-dust">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 pb-5 pt-4 font-mono text-[11px] tracking-[.5px] max-[720px]:p-4">
          <span>Hood Valley is an independent project on Robinhood Chain, not affiliated with Robinhood Markets, Inc. © 2026 Hood Valley</span>
          <span className="flex gap-3">
            {links.x ? (
              <a href={links.x} target="_blank" rel="noopener noreferrer" className="text-cream hover:text-gold">
                X ↗
              </a>
            ) : null}
            {links.discord ? (
              <a href={links.discord} target="_blank" rel="noopener noreferrer" className="text-cream hover:text-gold">
                DISCORD ↗
              </a>
            ) : null}
          </span>
        </div>
      </footer>

      {filing ? (
        <div role="status" className="fixed inset-0 z-90 flex flex-col items-center justify-center gap-12 bg-night/90 p-6">
          <div className="animate-stamp border-[6px] border-double border-gold px-7 py-3 font-pixel text-[clamp(48px,8vw,84px)] leading-none tracking-[3px] text-gold">
            CLAIM FILED
          </div>
          <div className="text-center font-mono text-[13px] tracking-[1.5px] text-cream">
            ASSIGNING YOUR PROSPECTOR NUMBER<span className="animate-dots">…</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ screen 1 · gate

function GateScreen({ view, notice, h1, total }: { view: ClaimView; notice: string | null; h1: React.RefObject<HTMLHeadingElement | null>; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/api/waitlist/start", { body: { handle } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    if (pathname === "/waitlist") router.refresh();
    else router.push("/waitlist");
  }

  return (
    <div className="grid animate-rise gap-[22px]">
      <div className="inline-flex items-center gap-2.5 justify-self-start bg-night px-3 py-[7px] font-mono text-[11px] tracking-[1.5px] text-gold">
        <span aria-hidden className="block size-2 flex-none animate-blink bg-moss" />
        <span>
          ALLOWLIST OPEN · 3,333 VALLEY MINERS<span className="max-[480px]:hidden"> · ROBINHOOD CHAIN</span>
        </span>
      </div>
      <h1 ref={h1} tabIndex={-1} className={cx(h1Class, "text-[84px]")}>
        CLAIM YOUR SPOT
        <br />
        IN THE VALLEY
      </h1>
      <p className="m-0 max-w-[560px] text-[19px] leading-[1.55] text-umber-3">
        Collect {NUMBER_WORDS[total] ?? total} stamps on your claim permit to join the Hood Valley allowlist. It takes about two minutes.
      </p>

      <ol aria-label="The stamps" className="m-0 grid list-none gap-2 p-0 max-[720px]:gap-1.5" style={{ gridTemplateColumns: `repeat(${view.route.length}, minmax(0, 1fr))` }}>
        {view.route.map((label, i) => (
          <li key={label + i} className="grid min-w-0 content-start gap-1.5 border-2 border-dashed border-rule bg-permit px-3 pb-3 pt-2.5 max-[720px]:px-1.5 max-[720px]:pb-[9px] max-[720px]:pt-2">
            <span className="font-pixel text-[28px] leading-none text-ink-link max-[720px]:text-[22px]">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-mono text-[11px] font-bold leading-[1.3] tracking-[1px] max-[720px]:text-[9px] max-[720px]:tracking-normal">{label}</span>
          </li>
        ))}
      </ol>

      <div className={cx(card, "grid gap-3.5 p-[26px] max-[720px]:px-[18px] max-[720px]:py-5 max-[720px]:shadow-[6px_6px_0_#1A1208]")}>
        <div className="font-mono text-[11.5px] tracking-[2px] text-ink-link">STEP 1 OF {total}</div>
        <h2 className="m-0 font-pixel text-[40px] font-normal leading-[.95]">VERIFY YOU&apos;RE A REAL PROSPECTOR</h2>
        <p className="m-0 max-w-[560px] text-[15.5px] leading-[1.6] text-umber-2">
          {view.xOAuth
            ? "We read your public X profile to confirm you're a real person and to print your handle on your permit. Hood Valley never posts on your behalf and never asks for write access."
            : "Enter your X handle to print it on your permit. Every handle is checked before the allowlist is final. Hood Valley never posts on your behalf."}
        </p>
        {view.xOAuth ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-[18px] gap-y-3">
            <a
              href="/api/waitlist/x/start"
              onClick={() => setRedirecting(true)}
              className="inline-flex items-center gap-3 border-3 border-night bg-night py-[13px] pl-3.5 pr-[22px] font-pixel text-[30px] leading-none text-gold shadow-[6px_6px_0_#C98500] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-gold-hi hover:shadow-[8px_8px_0_#C98500] max-[720px]:w-full max-[720px]:justify-center max-[720px]:p-3 max-[720px]:text-[26px]"
            >
              <span aria-hidden className="grid size-[30px] flex-none place-items-center bg-gold text-[26px] leading-none text-night">
                X
              </span>
              <span>{redirecting ? "REDIRECTING TO X…" : "CONNECT X TO BEGIN"}</span>
            </a>
            <span className="font-mono text-[11.5px] tracking-[.5px] text-ink-soft">READ-ONLY ACCESS · REVOKE ANY TIME IN X</span>
          </div>
        ) : (
          <form onSubmit={start} noValidate className="mt-1 flex flex-wrap items-end gap-2.5">
            <label className={cx(monoLabel, "grid min-w-0 flex-[1_1_240px] gap-1.5")}>
              <span>YOUR X HANDLE</span>
              <input
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setError("");
                }}
                placeholder="@yourhandle"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                className={cx("box-border h-[54px] w-full border-3 bg-white px-3 font-mono text-[15px] tracking-normal text-night placeholder:text-faded", error ? "border-seal" : "border-night")}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-[54px] flex-none cursor-pointer border-3 border-night bg-night px-5 font-pixel text-[26px] leading-none text-gold shadow-[6px_6px_0_#C98500] hover:text-gold-hi disabled:cursor-wait max-[720px]:w-full"
            >
              {busy ? "STAMPING…" : "START MY CLAIM"}
            </button>
          </form>
        )}
        {error || notice ? (
          <div role="alert" className="text-[13px] font-semibold text-seal">
            {error || notice}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ screen 2 · tasks

function TaskRow({ n, done, title, sub, children }: { n: number; done: boolean; title: string; sub: string; children: React.ReactNode }) {
  return (
    <li className={cx(pad, "grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2.5 border-b-2 border-paper-line py-4 max-[720px]:grid-cols-[38px_minmax(0,1fr)]")}>
      <span aria-hidden className={cx("box-border grid size-[38px] place-items-center border-2 border-night font-pixel text-2xl", done ? "bg-gold" : "bg-permit")}>
        {n}
      </span>
      <div className="min-w-0">
        <div className="font-bold">{title}</div>
        <div className="text-[13.5px] text-ink-soft [overflow-wrap:anywhere]">{sub}</div>
      </div>
      <div className="justify-self-end max-[720px]:col-start-2 max-[720px]:justify-self-start">{children}</div>
    </li>
  );
}

const DC_JOINED = "hv_dc_joined";

function DiscordRow({
  n,
  discord,
  done,
  who,
  notice,
  busy,
  onMark,
}: {
  n: number;
  discord: NonNullable<ClaimView["discord"]>;
  done: boolean;
  who: string | null;
  notice: string | null;
  busy: string | null;
  onMark: () => void;
}) {
  // The invite click survives the trip through Discord sign-in.
  const joinedBefore = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !!sessionStorage.getItem(DC_JOINED);
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [clicked, setClicked] = useState(false);
  const joined = clicked || joinedBefore;
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState(notice ?? "");

  function join() {
    window.open(discord.invite, "_blank", "noopener,noreferrer");
    setClicked(true);
    setMsg("");
    try {
      sessionStorage.setItem(DC_JOINED, "1");
    } catch {}
  }

  function confirmJoined() {
    setMsg("");
    if (!joined) return setMsg("Open the invite and join the server first, then confirm.");
    onMark();
  }

  const name = discord.username ? `@${discord.username}` : who;
  const sub = done
    ? discord.oauth
      ? `${name} · confirmed in the server`
      : "Marked as joined · checked before the allowlist is final"
    : discord.linked
      ? `${name} · not in the server yet`
      : "Shift times and mint news land here first.";
  const s2title = discord.oauth ? (discord.linked ? "Confirm you've joined" : "Connect your Discord") : "Confirm you've joined";
  const s2sub = discord.oauth
    ? discord.linked
      ? "We ask Discord again. No new permissions."
      : "Links your Discord account and checks membership."
    : "Recorded from your click and checked before the allowlist is final.";
  const s2btn = checking || busy === "discord" ? "CHECKING…" : discord.oauth && !discord.linked ? "CONNECT DISCORD →" : "I'VE JOINED";
  const subBtn = "cursor-pointer border-3 border-night px-3.5 py-2.5 font-mono text-xs font-bold tracking-[1px] max-[720px]:col-start-2 max-[720px]:justify-self-start";

  return (
    <li className={cx(pad, "grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3 border-b-2 border-paper-line py-4 max-[720px]:grid-cols-[38px_minmax(0,1fr)]")}>
      <span aria-hidden className={cx("box-border grid size-[38px] place-items-center border-2 border-night font-pixel text-2xl", done ? "bg-gold" : "bg-permit")}>
        {n}
      </span>
      <div className="min-w-0">
        <div className="font-bold">Join the Discord</div>
        <div className="text-[13.5px] text-ink-soft [overflow-wrap:anywhere]">{sub}</div>
      </div>
      {done ? (
        <div className="justify-self-end max-[720px]:col-start-2 max-[720px]:justify-self-start">
          <StampBadge verified={discord.oauth} />
        </div>
      ) : (
        <div className="col-[2/-1] grid gap-3 border-2 border-night bg-office px-4 py-3.5 max-[720px]:col-[1/-1] max-[720px]:p-3.5">
          <div className="font-mono text-[10.5px] tracking-[1.5px] text-ink-soft">{discord.linked ? "JOIN, THEN CONFIRM" : "DO THESE IN ORDER"}</div>
          <div className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 max-[720px]:grid-cols-[26px_minmax(0,1fr)]">
            <span
              aria-hidden
              className={cx("box-border grid size-[26px] place-items-center border-2 border-night font-pixel text-lg leading-none", joined ? "bg-ok text-permit" : "bg-gold text-night")}
            >
              {joined ? <PixelCheck /> : "1"}
            </span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-bold">Join the server</div>
              <div className="text-[12.5px] text-ink-soft">{joined ? "Invite opened. Now confirm below." : "Join first. Connecting before you join reports you as missing."}</div>
            </div>
            <button type="button" onClick={join} className={cx(subBtn, "justify-self-end bg-night text-cream hover:bg-clay")}>
              JOIN SERVER ↗
            </button>
          </div>
          <div className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 max-[720px]:grid-cols-[26px_minmax(0,1fr)]">
            <span aria-hidden className="box-border grid size-[26px] place-items-center border-2 border-night bg-gold font-pixel text-lg leading-none">
              2
            </span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-bold">{s2title}</div>
              <div className="text-[12.5px] text-ink-soft">{s2sub}</div>
            </div>
            {discord.oauth ? (
              <a
                href="/api/waitlist/discord/start"
                onClick={() => setChecking(true)}
                className={cx(subBtn, "justify-self-end bg-gold text-night hover:bg-gold-hi hover:text-night")}
              >
                {s2btn}
              </a>
            ) : (
              <button type="button" onClick={confirmJoined} disabled={busy !== null} className={cx(subBtn, "justify-self-end bg-gold text-night hover:bg-gold-hi disabled:cursor-wait")}>
                {s2btn}
              </button>
            )}
          </div>
          {msg ? (
            <div role="alert" className="text-[13px] font-semibold text-seal">
              {msg}
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

function FileClaim({
  consent: initialConsent,
  allDone,
  total,
  busy,
  setBusy,
  error,
  setError,
  onFiled,
}: {
  consent: boolean;
  allDone: boolean;
  total: number;
  busy: string | null;
  setBusy: (b: string | null) => void;
  error: string;
  setError: (e: string) => void;
  onFiled: () => void;
}) {
  const [consent, setConsent] = useState(initialConsent);
  const [token, setToken] = useState("");

  async function toggle(next: boolean) {
    setConsent(next);
    const res = await api("/api/waitlist/consent", { body: { agreed: next } });
    if (!res.ok) {
      setConsent(!next);
      setError(res.error.message);
    }
  }

  async function file() {
    if (turnstileEnabled && !token) return setError("Complete the human check first.");
    setBusy("filing");
    setError("");
    const res = await api<{ memberNo: number | null }>("/api/waitlist/enter", { body: { turnstileToken: token } });
    if (!res.ok) {
      setBusy(null);
      return setError(res.error.message);
    }
    setBusy("filed");
    onFiled();
  }

  const canFile = allDone && consent && busy === null;
  const hint = error
    ? error
    : !allDone
      ? `Collect all ${NUMBER_WORDS[total] ?? total} stamps and tick the box to file.`
      : !consent
        ? "Tick the box above to file your claim."
        : "Your permit gets a prospector number when you file.";

  return (
    <div className={cx(pad, "grid gap-4 pb-[22px] pt-[18px]")}>
      <p className="m-0 text-[12.5px] leading-[1.55] text-ink-soft">
        <strong className="text-ok">VERIFIED</strong> tasks are proven by sign-in. <strong className="text-shadow-gold">MARKED</strong> tasks are recorded from your click
        and reviewed before the allowlist is final.
      </p>
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.55] text-umber-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-px size-5 flex-none cursor-pointer accent-night"
        />
        <span>
          I agree to Hood Valley processing my public X and Discord profile data for waitlist verification and allowlist review. A wallet address, once linked,
          is stored with this profile.
        </span>
      </label>
      <Turnstile onToken={setToken} />
      <button
        type="button"
        onClick={file}
        disabled={!canFile}
        className={cx(
          "w-full border-3 p-4 font-pixel text-[34px] leading-none",
          canFile ? "cursor-pointer border-night bg-gold text-night shadow-[6px_6px_0_#1A1208] hover:bg-gold-hi" : "border-rule bg-off text-off-ink",
        )}
      >
        {busy === "filing" ? "FILING…" : "FILE MY CLAIM"}
      </button>
      <div role={error ? "alert" : undefined} className={cx("text-center font-mono text-[11.5px] tracking-[.5px]", error ? "font-bold text-seal" : "text-ink-soft")}>
        {hint}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ screen 3 · filed

function FiledScreen({ view, h1, onChanged }: { view: ClaimView; h1: React.RefObject<HTMLHeadingElement | null>; onChanged: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const no = permitNo(view.memberNo);

  async function save(address: string | null) {
    if (address !== null && !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return setError("That doesn't look like a valid EVM address: 0x followed by 40 hex characters.");
    }
    setBusy(true);
    setError("");
    const res = await api("/api/waitlist/wallet", { body: { address } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setValue("");
    onChanged();
  }

  function share() {
    const text = `I just filed my claim in Hood Valley ⛏️ Prospector No. ${no} · 3,333 Valley Miners, one 12-hour shift a day on Robinhood Chain.`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer");
    setShared(true);
  }

  const step = "font-pixel text-[30px] leading-none text-ink-link";
  const h2 = "m-0 font-pixel text-[30px] font-normal leading-none";
  const outline = "block border-3 border-night px-3.5 py-2.5 font-mono text-xs font-bold tracking-[1px] text-night hover:text-night";

  return (
    <div className="grid animate-rise gap-[22px]">
      <div className="inline-flex items-center gap-2 justify-self-start border-2 border-ok bg-ok-bg px-3 py-1.5 font-mono text-[11.5px] font-bold tracking-[1.5px] text-ok">
        <PixelCheck />
        CLAIM FILED
      </div>
      <h1 ref={h1} tabIndex={-1} className={h1Class}>
        YOU&apos;RE ON THE
        <br />
        ALLOWLIST
      </h1>
      <p className="m-0 max-w-[600px] text-lg leading-[1.55] text-umber-3">
        Prospector No. {no} · {view.who}. Mint dates and prices are announced before public release, and we&apos;ll reach you on X and Discord.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-3 justify-self-start border-3 border-night bg-night px-[22px] py-[13px] font-pixel text-[30px] leading-none text-gold shadow-[6px_6px_0_#C98500] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-gold-hi hover:shadow-[8px_8px_0_#C98500] max-[720px]:w-full max-[720px]:justify-center max-[720px]:text-[26px]"
      >
        OPEN THE FIELD JOURNAL →
      </Link>

      <div className={card}>
        <div className={cx(pad, "grid gap-3 border-b-2 border-paper-line pb-[22px] pt-5")}>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={step}>01</span>
            <h2 className={h2}>LINK YOUR WALLET</h2>
            {view.wallet ? (
              <span className="ml-auto border-2 border-ok bg-ok-bg px-[9px] py-[3px] font-mono text-[10.5px] font-bold tracking-[1.5px] text-ok">LINKED</span>
            ) : null}
          </div>
          <p className="m-0 text-[14.5px] text-umber-2">The EVM wallet you&apos;ll mint with on Robinhood Chain. You can change it until the snapshot.</p>
          {view.wallet ? (
            <div className="flex flex-wrap items-center gap-3 border-2 border-night bg-office px-3.5 py-3">
              <span className="bg-night px-2 py-0.5 font-mono text-[10.5px] tracking-[1px] text-cream">EVM</span>
              <span className="font-mono text-[14.5px] font-bold">{shortWallet(view.wallet)}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => save(null)}
                className="ml-auto cursor-pointer border-2 border-night bg-transparent px-3 py-[7px] font-mono text-[11.5px] font-bold tracking-[1px] text-night hover:bg-permit"
              >
                {busy ? "…" : "UNLINK"}
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void save(value.trim());
              }}
              className="flex flex-wrap items-end gap-2.5"
            >
              <label className={cx(monoLabel, "grid min-w-0 flex-[1_1_260px] gap-1.5")}>
                <span>WALLET ADDRESS</span>
                <input
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value.trim());
                    setError("");
                  }}
                  placeholder="0x… EVM address"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!error}
                  className={cx("box-border h-[54px] w-full border-3 bg-white px-3 font-mono text-[14.5px] tracking-normal text-night placeholder:text-faded", error ? "border-seal" : "border-night")}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="box-border h-[54px] flex-none cursor-pointer border-3 border-night bg-night px-5 font-pixel text-[26px] leading-none text-gold hover:text-gold-hi disabled:cursor-wait max-[720px]:flex-[1_1_100%]"
              >
                {busy ? "LINKING…" : "LINK WALLET"}
              </button>
            </form>
          )}
          {error ? (
            <div role="alert" className="text-[13px] font-semibold text-seal">
              {error}
            </div>
          ) : null}
        </div>
        <div className={cx(pad, "flex flex-wrap items-center gap-4 border-b-2 border-paper-line py-5")}>
          <div className="grid min-w-0 flex-[1_1_260px] gap-1.5">
            <div className="flex items-baseline gap-3">
              <span className={step}>02</span>
              <h2 className={h2}>SHARE YOUR PERMIT</h2>
            </div>
            <p className="m-0 text-[14.5px] text-umber-2">Post your stamped permit on X and bring your crew to the valley.</p>
          </div>
          <button
            type="button"
            onClick={share}
            className={cx(
              "inline-flex cursor-pointer items-center gap-2 border-3 border-night px-4 py-2.5 font-pixel text-2xl leading-none text-night shadow-[4px_4px_0_#1A1208]",
              shared ? "bg-ok-bg" : "bg-gold hover:bg-gold-hi",
            )}
          >
            <span>{shared ? "SHARED" : "SHARE ON X ↗"}</span>
            {shared ? <PixelCheck size={16} /> : null}
          </button>
        </div>
        <div className={cx(pad, "flex flex-wrap items-center gap-4 py-5")}>
          <div className="grid min-w-0 flex-[1_1_260px] gap-1.5">
            <div className="flex items-baseline gap-3">
              <span className={step}>03</span>
              <h2 className={h2}>KEEP EXPLORING</h2>
            </div>
            <p className="m-0 text-[14.5px] text-umber-2">See how the daily shift and Season 1 work while you wait.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className={cx(outline, "bg-gold hover:bg-gold-hi")}>
              FIELD JOURNAL
            </Link>
            <Link href="/litepaper" className={cx(outline, "bg-permit hover:bg-office")}>
              LITEPAPER
            </Link>
            <Link href="/play" className={cx(outline, "bg-permit hover:bg-office")}>
              VALLEY HQ PREVIEW
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
