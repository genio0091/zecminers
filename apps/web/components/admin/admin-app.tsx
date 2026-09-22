"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, fmt, newIdempotencyKey, short } from "@/lib/client-api";
import { Logo } from "../site/header";
import { Bar, Button, FinePrint, Label, Panel, Row, Stat, Well, cx } from "../ui";

type Overview = {
  serverTime: string;
  config: { version: number; activeFrom: string; params: Record<string, unknown> };
  pools: Record<string, string>;
  runway: { days: number | null; activeSlots: number; avgRewardPerSlotDay: string; basis: string };
  passes: Record<string, number>;
  batch: {
    id: string;
    week: string;
    status: string;
    heldReason: string | null;
    recipients: number;
    total: string;
    feeZats: number;
    items: Record<string, { count: number; total: string }>;
  } | null;
  batches: { id: string; week: string; status: string; recipients: number; total: string; heldReason: string | null }[];
  snapshot: { takenAt: string; ok: boolean; invariants: { name: string; ok: boolean | null; detail: string }[] } | null;
  maintenance: { on: boolean; reason: string; since: string };
  miningHalted: boolean;
  registry: Record<string, string>;
  alerts: { id: number; level: string; kind: string; message: string; createdAt: string }[];
  audit: { id: number; adminId: string; action: string; reason: string; createdAt: string }[];
  chain: { mode: string; network: string; tipHeight: number | null };
};

const REGISTRY_FIELDS = [
  "token_tick",
  "token_deploy_txid",
  "token_mint_txid",
  "token_inscription_id",
  "token_deploy_height",
  "token_mint_outpoint",
  "treasury_address",
  "hot_wallet_address",
  "pass_collection",
  "pass_collection_inscription_id",
  "pass_collection_deploy_txid",
  "pass_supply",
  "explorer_base_url",
];

function askReason(what: string): string | null {
  const r = window.prompt(`Reason for: ${what}\n(written to the audit log)`);
  if (r === null) return null;
  if (r.trim().length < 3) {
    window.alert("A reason of at least 3 characters is required.");
    return null;
  }
  return r.trim();
}

function Section({ title, children, tone = "coal", right }: { title: string; children: React.ReactNode; tone?: "coal" | "coal-2"; right?: React.ReactNode }) {
  return (
    <Panel tone={tone} className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-pixel text-2xl">{title}</div>
        {right}
      </div>
      {children}
    </Panel>
  );
}

const input = "border-3 border-black bg-ink px-3 py-2 text-[13px] text-cream";

export function AdminApp() {
  const [o, setO] = useState<Overview | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Overview>("/api/admin/overview");
    if (r.ok) setO(r.data);
    else setMsg({ ok: false, text: r.error.message });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state updates after the request resolves
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function run<T>(label: string, path: string, body: unknown, opts: { idem?: boolean } = {}): Promise<T | null> {
    setBusy(true);
    const r = await api<T>(path, { body, idempotencyKey: opts.idem ? newIdempotencyKey("adm") : undefined });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `${label}: done` } : { ok: false, text: `${label}: ${r.error.message}` });
    await load();
    return r.ok ? r.data : null;
  }

  const quick = (label: string, path: string, extra: Record<string, unknown> = {}) => {
    const reason = askReason(label);
    if (reason) void run(label, path, { ...extra, reason });
  };

  if (!o) return <div className="p-8 text-dust">{msg?.text ?? "Loading admin…"}</div>;
  const inv = o.snapshot?.invariants ?? [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b-3 border-black bg-ink/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-5 py-2.5">
          <Link href="/" className="hover:text-cream">
            <Logo size="sm" />
          </Link>
          <span className="border-3 border-black bg-coal px-2 text-[10px] tracking-[1.5px] text-gold">ADMIN</span>
          <Link href="/play" className="text-xs text-khaki">
            ◂ game
          </Link>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-khaki">
            <span>
              chain <span className={o.chain.mode === "live" ? "text-moss" : "text-gold"}>{o.chain.mode}</span> · {o.chain.network} · tip{" "}
              {o.chain.tipHeight !== null ? fmt(o.chain.tipHeight) : "—"}
            </span>
          </div>
        </div>
        {msg ? (
          <div className={cx("mx-auto max-w-[1280px] px-5 pb-2 text-[13px]", msg.ok ? "text-moss" : "text-ember")} role="status">
            {msg.text}
          </div>
        ) : null}
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-5 px-5 pb-24 pt-6">
        {/* ---- switches ---- */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <Stat
            label="Maintenance"
            value={o.maintenance.on ? "ON" : "off"}
            valueClass={o.maintenance.on ? "text-ember" : "text-moss"}
            className="cursor-pointer"
          />
          <Stat label="Mining" value={o.miningHalted ? "HALTED" : "running"} valueClass={o.miningHalted ? "text-ember" : "text-moss"} />
          <Stat
            label="Reserve checks"
            value={o.snapshot ? (o.snapshot.ok ? `${inv.filter((i) => i.ok).length} / ${inv.length} PASS` : "FAILING") : "never run"}
            valueClass={o.snapshot?.ok === false ? "text-ember" : "text-moss"}
          />
          <Stat label="Mining runway" value={o.runway.days !== null ? `${fmt(o.runway.days)} days` : "—"} valueClass="text-moss" />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant={o.maintenance.on ? "moss" : "ember"} disabled={busy} onClick={() => quick(o.maintenance.on ? "Maintenance off" : "Maintenance on", "/api/admin/maintenance", { on: !o.maintenance.on })}>
            {o.maintenance.on ? "Turn maintenance off" : "Turn maintenance on"}
          </Button>
          <Button variant="dark" disabled={busy} onClick={() => quick(o.miningHalted ? "Resume mining" : "Halt mining", "/api/admin/mining", { halted: !o.miningHalted })}>
            {o.miningHalted ? "Resume mining" : "Halt mining"}
          </Button>
          <Button variant="dark" disabled={busy} onClick={() => run("Reserve checks", "/api/admin/checks", {})}>
            Run reserve checks
          </Button>
          <Button variant="dark" disabled={busy} onClick={() => quick("Run pass owner check", "/api/admin/jobs/pass-owners")}>
            Check pass owners
          </Button>
        </div>
        {o.maintenance.on ? <FinePrint className="text-ember">Maintenance reason: {o.maintenance.reason}</FinePrint> : null}

        {/* ---- weekly batch ---- */}
        <Section
          title={o.batch ? `Weekly batch · ${o.batch.week}` : "Weekly batch"}
          right={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="dark" disabled={busy} onClick={() => quick("Run weekly cutoff now", "/api/admin/payouts/cutoff")}>
                Run cutoff
              </Button>
              <Button size="sm" variant="dark" disabled={busy} onClick={() => quick("Settle sent payouts", "/api/admin/jobs/payout-settle")}>
                Settle
              </Button>
            </div>
          }
        >
          {o.batch ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-pixel text-[28px] capitalize">{o.batch.status === "draft" ? "Awaiting approval" : o.batch.status}</div>
                <div className="flex gap-2">
                  <Button
                    variant="moss"
                    disabled={busy || !["draft", "held"].includes(o.batch.status)}
                    onClick={() => quick(`Approve batch ${o.batch!.week}`, `/api/admin/payouts/${o.batch!.id}/approve`)}
                  >
                    Approve batch
                  </Button>
                  <Button variant="ember" disabled={busy || o.batch.status === "done"} onClick={() => quick(`Hold batch ${o.batch!.week}`, `/api/admin/payouts/${o.batch!.id}/hold`)}>
                    Hold
                  </Button>
                </div>
              </div>
              {o.batch.heldReason ? <p className="m-0 text-[13px] text-ember">Held: {o.batch.heldReason}</p> : null}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <Well className="p-3">
                  <Label>RECIPIENTS</Label>
                  <div className="font-pixel text-[22px]">{fmt(o.batch.recipients)}</div>
                </Well>
                <Well className="p-3">
                  <Label>TOTAL</Label>
                  <div className="font-pixel text-[22px] text-gold-hi">{fmt(o.batch.total)}</div>
                </Well>
                <Well className="p-3">
                  <Label>EST. FEES</Label>
                  <div className="font-pixel text-[22px]">{(o.batch.feeZats / 1e8).toFixed(4)} ZEC</div>
                </Well>
                <Well className="p-3">
                  <Label>INVARIANTS</Label>
                  <div className={cx("font-pixel text-[22px]", o.snapshot?.ok ? "text-moss" : "text-ember")}>{o.snapshot?.ok ? "PASS" : "CHECK"}</div>
                </Well>
              </div>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {Object.entries(o.batch.items).map(([k, v]) => (
                  <span key={k} className="border-3 border-black bg-ink px-2 py-0.5">
                    {k}: {v.count} · {fmt(v.total)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="m-0 text-dust">No batch yet. The cutoff job creates one every week at 00:00 UTC on the payout day.</p>
          )}
          <FinePrint className="mt-3">
            Approval hands the batch to the isolated signer. Nothing is signed on this server. Every approval is written to the audit log.
          </FinePrint>
          {o.batches.length > 1 ? (
            <div className="mt-3 grid gap-1 text-[12.5px]">
              {o.batches.slice(1).map((b) => (
                <div key={b.id} className="flex flex-wrap justify-between gap-2 border-b-3 border-ink py-1">
                  <span>{b.week}</span>
                  <span className="text-khaki">{b.status}</span>
                  <span>{fmt(b.recipients)} recipients</span>
                  <span className="text-gold-hi">{fmt(b.total)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
          <Section title="Reserve checks">
            <div className="grid gap-2">
              {inv.length === 0 ? <p className="m-0 text-dust">Not run yet.</p> : null}
              {inv.map((i) => (
                <Well key={i.name} className="flex gap-3 p-2.5 text-[12.5px]">
                  <span className={cx("mt-1 block size-3 flex-none border-3 border-black", i.ok ? "bg-moss" : i.ok === false ? "bg-ember" : "bg-olive")} />
                  <div>
                    <div>{i.name}</div>
                    <div className="text-stone">{i.detail}</div>
                  </div>
                </Well>
              ))}
            </div>
            {o.snapshot ? <FinePrint className="mt-2">Last snapshot {new Date(o.snapshot.takenAt).toISOString().slice(0, 19).replace("T", " ")} UTC</FinePrint> : null}
          </Section>
          <Section title="Pools & runway" tone="coal-2">
            <div className="grid gap-2 text-[13px]">
              {Object.entries(o.pools).map(([k, v]) => (
                <Row key={k} label={k}>
                  <span className="text-gold-hi">{fmt(v)}</span>
                </Row>
              ))}
              <Row label="Active slots">{fmt(o.runway.activeSlots)}</Row>
              <Row label={`Avg reward / slot-day (${o.runway.basis})`}>{fmt(o.runway.avgRewardPerSlotDay)}</Row>
              <Row label="Passes">{Object.entries(o.passes).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}</Row>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
          <PassImport busy={busy} run={run} />
          <ConfigEditor current={o.config} busy={busy} run={run} />
        </div>

        <TestLogins busy={busy} run={run} quick={quick} />

        <PassesList busy={busy} quick={quick} run={run} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
          <RaffleAdmin tip={o.chain.tipHeight} busy={busy} run={run} quick={quick} />
          <UsersAdmin busy={busy} run={run} quick={quick} />
        </div>

        <GenesisForm registry={o.registry} busy={busy} run={run} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
          <Section title="Alerts" tone="coal-2">
            <div className="grid max-h-[360px] gap-1.5 overflow-auto text-[12.5px]">
              {o.alerts.length === 0 ? <p className="m-0 text-dust">No alerts.</p> : null}
              {o.alerts.map((a) => (
                <Well key={a.id} className="p-2.5">
                  <span className={cx("mr-2", a.level === "critical" || a.level === "high" ? "text-ember" : "text-khaki")}>{a.level.toUpperCase()}</span>
                  <span className="text-gold-hi">{a.kind}</span> · {a.message}
                  <div className="text-stone">{a.createdAt.slice(0, 19).replace("T", " ")}</div>
                </Well>
              ))}
            </div>
          </Section>
          <Section title="Audit log" tone="coal-2">
            <div className="grid max-h-[360px] gap-1.5 overflow-auto text-[12.5px]">
              {o.audit.map((a) => (
                <Well key={a.id} className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 p-2.5">
                  <span className="text-khaki">{a.createdAt.slice(5, 16).replace("T", " ")}</span>
                  <span>{a.action}</span>
                  <span className="text-dust">{a.reason}</span>
                </Well>
              ))}
            </div>
            <FinePrint className="mt-2">Every admin action needs a reason and is written here before it takes effect.</FinePrint>
          </Section>
        </div>
      </main>
    </>
  );
}

type Run = <T>(label: string, path: string, body: unknown, opts?: { idem?: boolean }) => Promise<T | null>;
type Quick = (label: string, path: string, extra?: Record<string, unknown>) => void;

function PassImport({ busy, run }: { busy: boolean; run: Run }) {
  const [lines, setLines] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{
    dryRun: boolean;
    created: { passNumber: number; address: string; claimCode: string }[];
    rejected: { line: number; address: string; reason: string }[];
  } | null>(null);
  const go = async (dryRun: boolean) => {
    const r = await run<typeof result>(dryRun ? "Import dry run" : "Import passes", "/api/admin/passes/import", { lines, dryRun, reason });
    if (r) setResult(r);
  };
  const csv = result && !result.dryRun ? ["pass_number,address,claim_code", ...result.created.map((c) => `${c.passNumber},${c.address},${c.claimCode}`)].join("\n") : "";
  return (
    <Section title="Pass import">
      <p className="mb-2.5 mt-0 text-[13px] text-dust">
        One winner per line: <code>t1address[,inscriptionId][,note]</code>. Each gets a one-time claim code to send by DM. Codes are shown once — download them.
      </p>
      <textarea rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={"t1…\nt1…,inscriptionid"} className={cx(input, "w-full font-mono")} />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. airdrop batch 4)" className={cx(input, "mt-2 w-full")} />
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        <Button disabled={busy || !lines.trim() || reason.trim().length < 3} onClick={() => go(false)}>
          Import + generate codes
        </Button>
        <Button variant="ghost" disabled={busy || !lines.trim() || reason.trim().length < 3} onClick={() => go(true)}>
          Dry run
        </Button>
      </div>
      {result ? (
        <div className="mt-3 grid gap-1.5 text-[12.5px]">
          <div className="text-moss">
            {result.dryRun ? "Dry run:" : "Imported:"} {result.created.length} pass(es), {result.rejected.length} rejected
          </div>
          {result.rejected.map((r) => (
            <div key={`${r.line}-${r.address}`} className="text-ember">
              line {r.line}: {short(r.address, 10, 6)} — {r.reason}
            </div>
          ))}
          {!result.dryRun && result.created.length ? (
            <>
              <div className="max-h-48 overflow-auto border-3 border-black bg-ink p-2 font-mono">
                {result.created.map((c) => (
                  <div key={c.passNumber}>
                    #{c.passNumber} {short(c.address, 10, 6)} <span className="text-gold-hi">{c.claimCode}</span>
                  </div>
                ))}
              </div>
              <a download="zecminers-claim-codes.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>
                Download CSV ▸
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

function ConfigEditor({ current, busy, run }: { current: Overview["config"]; busy: boolean; run: Run }) {
  const [text, setText] = useState(() => JSON.stringify(current.params, null, 2));
  const [activeFrom, setActiveFrom] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const publish = async () => {
    let params: unknown;
    try {
      params = JSON.parse(text);
    } catch {
      return setErr("Not valid JSON.");
    }
    setErr("");
    await run("Publish config", "/api/admin/config", { params, reason, activeFrom: activeFrom ? new Date(activeFrom).toISOString() : undefined });
  };
  return (
    <Section title="Economy config" tone="coal-2">
      <Row label="Active version">
        v{current.version} · from {current.activeFrom.slice(0, 10)}
      </Row>
      <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} className={cx(input, "mt-2.5 w-full font-mono text-[12px]")} spellCheck={false} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className={input} aria-label="Active from (optional)" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className={input} />
      </div>
      {err ? <div className="mt-1 text-[12.5px] text-ember">{err}</div> : null}
      <div className="mt-2.5">
        <Button disabled={busy || reason.trim().length < 3} onClick={publish}>
          Publish new version
        </Button>
      </div>
      <FinePrint className="mt-2">Publishing never overwrites an old version. Running sessions keep the version they started with.</FinePrint>
    </Section>
  );
}

function TestLogins({ busy, run, quick }: { busy: boolean; run: Run; quick: Quick }) {
  const [count, setCount] = useState(10);
  const [label, setLabel] = useState("team test login");
  const [reason, setReason] = useState("");
  const [logins, setLogins] = useState<{ passNumber: number; address: string; claimCode: string }[] | null>(null);
  const go = async () => {
    const r = await run<{ passNumber: number; address: string; claimCode: string }[]>("Generate test logins", "/api/admin/passes/test", { count, label, reason });
    if (r) setLogins(r);
  };
  const csv = logins ? ["pass_number,address,claim_code", ...logins.map((l) => `${l.passNumber},${l.address},${l.claimCode}`)].join("\n") : "";
  return (
    <Section
      title="Team test logins"
      tone="coal-2"
      right={
        <Button size="sm" variant="ember" disabled={busy} onClick={() => quick("Deactivate all test passes", "/api/admin/passes/test/deactivate")}>
          Deactivate all test passes
        </Button>
      }
    >
      <p className="mb-3 mt-0 text-[13px] text-dust">
        Each login is a fresh t1 address + claim code for the wallet sign-in. Test passes can play but are <strong className="text-cream">never paid out</strong>.
        The addresses have no private key — never send funds to them. Codes are shown once: download the CSV.
      </p>
      <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_auto]">
        <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} className={input} aria-label="How many" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={input} aria-label="Label" placeholder="Label" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={input} placeholder="Reason (e.g. team QA)" />
        <Button disabled={busy || reason.trim().length < 3} onClick={go}>
          Generate
        </Button>
      </div>
      {logins ? (
        <div className="mt-3 grid gap-1.5 text-[12.5px]">
          <div className="text-moss">{logins.length} test login(s) created.</div>
          <div className="max-h-48 overflow-auto border-3 border-black bg-ink p-2 font-mono">
            {logins.map((l) => (
              <div key={l.passNumber}>
                #{l.passNumber} {l.address} <span className="text-gold-hi">{l.claimCode}</span>
              </div>
            ))}
          </div>
          <a download="zecminers-team-logins.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>
            Download CSV ▸
          </a>
        </div>
      ) : null}
    </Section>
  );
}

type PassRow = {
  id: string;
  passNumber: number;
  originAddress: string;
  inscriptionId: string | null;
  status: string;
  statusReason: string | null;
  userId: string | null;
  isTest?: boolean;
};

function PassesList({ busy, quick, run }: { busy: boolean; quick: Quick; run: Run }) {
  const [rows, setRows] = useState<PassRow[]>([]);
  const load = useCallback(() => api<PassRow[]>("/api/admin/passes/list").then((r) => r.ok && setRows(r.data)), []);
  useEffect(() => {
    load();
  }, [load, busy]);
  const setIns = async (p: PassRow) => {
    const id = window.prompt(`Inscription id for pass #${p.passNumber}`, p.inscriptionId ?? "");
    if (!id) return;
    const reason = askReason("Record pass inscription");
    if (reason) await run("Record inscription", `/api/admin/passes/${p.id}/inscription`, { inscriptionId: id, reason });
  };
  return (
    <Section title={`Passes (${rows.length})`}>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead className="text-khaki">
            <tr>
              <th className="p-1.5">#</th>
              <th className="p-1.5">Origin address</th>
              <th className="p-1.5">Inscription</th>
              <th className="p-1.5">Status</th>
              <th className="p-1.5">Linked</th>
              <th className="p-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t-3 border-ink">
                <td className="p-1.5">
                  {p.passNumber}
                  {p.isTest ? <span className="ml-1.5 border-2 border-black bg-olive px-1 text-[10px] text-cream">TEST</span> : null}
                </td>
                <td className="p-1.5">{short(p.originAddress, 10, 6)}</td>
                <td className="p-1.5">
                  <button type="button" className="cursor-pointer text-gold-hi" onClick={() => setIns(p)}>
                    {p.inscriptionId ? short(p.inscriptionId, 8, 4) : "set…"}
                  </button>
                </td>
                <td className={cx("p-1.5", p.status === "active" ? "text-moss" : p.status === "moved" || p.status === "deactivated" ? "text-ember" : "text-khaki")}>
                  {p.status}
                </td>
                <td className="p-1.5">{p.userId ? "yes" : "—"}</td>
                <td className="p-1.5 text-right">
                  {p.status !== "deactivated" ? (
                    <button type="button" disabled={busy} className="cursor-pointer text-ember" onClick={() => quick(`Deactivate pass #${p.passNumber}`, `/api/admin/passes/${p.id}/deactivate`)}>
                      deactivate
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FinePrint className="mt-2">Deactivating stops the pass in the game only; the inscription stays on-chain.</FinePrint>
    </Section>
  );
}

type RaffleRow = { id: number; title: string; status: string; closeBlockHeight: number; totalTickets: number; prizeAmount: string };

function RaffleAdmin({ tip, busy, run, quick }: { tip: number | null; busy: boolean; run: Run; quick: Quick }) {
  const [rows, setRows] = useState<RaffleRow[]>([]);
  const [f, setF] = useState({ title: "Golden Ticket", ticketPrice: "500", prizeAmount: "25000", winnerCount: 1, closeBlockHeight: (tip ?? 0) + 8_000, reason: "" });
  const load = useCallback(() => api<RaffleRow[]>("/api/public/raffles").then((r) => r.ok && setRows(r.data)), []);
  useEffect(() => {
    load();
  }, [load, busy]);
  return (
    <Section title="Raffles">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
        <input className={input} value={f.ticketPrice} onChange={(e) => setF({ ...f, ticketPrice: e.target.value })} aria-label="Ticket price" placeholder="Ticket price" />
        <input className={input} value={f.prizeAmount} onChange={(e) => setF({ ...f, prizeAmount: e.target.value })} aria-label="Prize (from marketing pool)" placeholder="Prize" />
        <input className={input} type="number" value={f.winnerCount} onChange={(e) => setF({ ...f, winnerCount: Number(e.target.value) })} aria-label="Winners" />
        <input
          className={input}
          type="number"
          value={f.closeBlockHeight}
          onChange={(e) => setF({ ...f, closeBlockHeight: Number(e.target.value) })}
          aria-label="Close block height"
        />
        <input className={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Reason" />
      </div>
      <FinePrint className="mt-1.5">
        Tip {tip !== null ? fmt(tip) : "—"}. ~8,000 blocks ≈ 7 days at 75 s; after NU7 blocks are 25 s, so pick H by time, not count.
      </FinePrint>
      <div className="mt-2">
        <Button disabled={busy || f.reason.trim().length < 3} onClick={() => run("Create raffle", "/api/admin/raffles", f)}>
          Open raffle
        </Button>
      </div>
      <div className="mt-3 grid gap-1.5 text-[12.5px]">
        {rows.map((r) => (
          <Well key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
            <span>
              #{r.id} {r.title} · <span className="text-khaki">{r.status}</span> · H {fmt(r.closeBlockHeight)} · {fmt(r.totalTickets)} tickets
            </span>
            {r.status === "open" || r.status === "closed" ? (
              <button type="button" disabled={busy} className="cursor-pointer text-gold-hi" onClick={() => quick(`Draw raffle #${r.id}`, `/api/admin/raffles/${r.id}/draw`)}>
                draw
              </button>
            ) : null}
          </Well>
        ))}
      </div>
    </Section>
  );
}

type UserRow = { id: string; discordUsername: string | null; status: string; role: string; walletAddress: string | null; balance: string };

function UsersAdmin({ busy, run, quick }: { busy: boolean; run: Run; quick: Quick }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [grant, setGrant] = useState<{ userId: string; amount: string } | null>(null);
  const search = useCallback(() => api<UserRow[]>(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => r.ok && setRows(r.data)), [q]);
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);
  return (
    <Section title="Users" tone="coal-2">
      <div className="flex gap-2">
        <input className={cx(input, "flex-1")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Discord name, address or id" onKeyDown={(e) => e.key === "Enter" && search()} />
        <Button size="sm" variant="dark" onClick={search}>
          Search
        </Button>
      </div>
      <div className="mt-2.5 grid max-h-[340px] gap-1.5 overflow-auto text-[12.5px]">
        {rows.map((u) => (
          <Well key={u.id} className="grid gap-1 p-2.5">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                {u.discordUsername ?? "—"} <span className="text-stone">{u.role === "admin" ? "· admin" : ""}</span>
              </span>
              <span className={u.status === "frozen" ? "text-ember" : "text-moss"}>{u.status}</span>
            </div>
            <div className="text-stone">
              {short(u.walletAddress, 10, 6)} · balance <span className="text-gold-hi">{fmt(u.balance)}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy} className="cursor-pointer text-ember" onClick={() => quick(u.status === "frozen" ? "Unfreeze user" : "Freeze user", `/api/admin/users/${u.id}/freeze`, { frozen: u.status !== "frozen" })}>
                {u.status === "frozen" ? "unfreeze" : "freeze"}
              </button>
              <button type="button" className="cursor-pointer text-gold-hi" onClick={() => setGrant({ userId: u.id, amount: "1000" })}>
                grant…
              </button>
            </div>
            {grant?.userId === u.id ? (
              <div className="flex gap-2">
                <input className={cx(input, "w-32")} value={grant.amount} onChange={(e) => setGrant({ ...grant, amount: e.target.value })} />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    const reason = askReason("Grant from marketing pool");
                    if (reason) await run("Grant", "/api/admin/grants", { userId: u.id, amount: grant.amount, reason }, { idem: true });
                    setGrant(null);
                  }}
                >
                  Grant
                </Button>
              </div>
            ) : null}
          </Well>
        ))}
      </div>
    </Section>
  );
}

function GenesisForm({ registry, busy, run }: { registry: Record<string, string>; busy: boolean; run: Run }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(REGISTRY_FIELDS.map((k) => [k, registry[k] ?? ""])));
  const [postLedger, setPostLedger] = useState(false);
  const [reason, setReason] = useState("");
  const pools = Number(Boolean(registry.treasury_address));
  return (
    <Section title="Genesis registry (Phase 0)">
      <p className="mb-3 mt-0 text-[13px] text-dust">
        Record the deploy/mint txids, inscription ids and the treasury address after the blueprint §6.4 checks pass in Zord. Post the genesis ledger transaction
        exactly once — it funds the pools 80/10/5/5 against the on-chain treasury.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {REGISTRY_FIELDS.map((k) => (
          <label key={k} className="grid gap-1 text-[10px] uppercase tracking-[1.5px] text-khaki">
            {k}
            <input className={input} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} spellCheck={false} />
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={postLedger} onChange={(e) => setPostLedger(e.target.checked)} />
        Post the genesis ledger transaction (idempotent — safe to leave on)
      </label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className={cx(input, "mt-2 w-full")} />
      <div className="mt-2.5 flex items-center gap-3">
        <Button disabled={busy || reason.trim().length < 3} onClick={() => run("Record genesis", "/api/admin/genesis", { entries: vals, postLedgerGenesis: postLedger, reason })}>
          Save registry
        </Button>
        <Bar pct={pools * 100} color="bg-moss" className="w-24" />
      </div>
    </Section>
  );
}
