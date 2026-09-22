import type { PublicReserves } from "@/lib/public-data";
import { fmt } from "@/lib/client-api";
import { Bar, FinePrint, Label, Panel, Stat, Well, cx } from "./ui";

const INVARIANT_LABEL: Record<string, string> = {
  ledger_matches_supply: "Ledger total matches supply minus settled payouts",
  transactions_sum_to_zero: "Every ledger transaction sums to zero",
  no_negative_balances: "No account below zero",
  onchain_treasury_matches: "On-chain treasury matches the unpaid balance (Zord)",
};

const POOL_COLOR: Record<string, string> = {
  pool_mining: "bg-gold",
  pool_daily: "bg-gold-hi",
  pool_marketing: "bg-ember",
  pool_liquidity: "bg-moss",
};

function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172_800) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function explorerLink(base: string | undefined, kind: "tx" | "address" | "inscription", id: string | undefined) {
  if (!id) return <span className="text-stone">Published when Phase 0 is confirmed on-chain</span>;
  if (!base) return <span className="break-all">{id}</span>;
  return (
    <a href={`${base.replace(/\/$/, "")}/${kind}/${id}`} target="_blank" rel="noreferrer" className="break-all">
      {id}
    </a>
  );
}

export function ReservesView({ data }: { data: PublicReserves }) {
  const reg = data.registry;
  const inv = data.snapshot?.invariants ?? [];
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Stat size="lg" label="Total supply minted" value={fmt(data.token.totalSupply)} />
        <Stat
          size="lg"
          label="Treasury + hot wallet (Zord)"
          value={data.treasury.onchain !== null ? fmt(data.treasury.onchain) : data.genesisPublished ? "Unavailable" : "At genesis"}
          valueClass="text-cream"
        />
        <Stat size="lg" label="Settled payouts" value={fmt(data.paidOut)} valueClass="text-cream" />
        <Stat
          size="lg"
          label="Last check"
          value={data.snapshot ? ago(data.snapshot.takenAt) : "Not yet"}
          valueClass={data.snapshot?.ok === false ? "text-ember" : "text-moss"}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <Panel className="p-5">
          <div className="mb-3.5 font-pixel text-2xl">Reserve checks</div>
          <div className="grid gap-2.5">
            {(inv.length ? inv : Object.keys(INVARIANT_LABEL).map((name) => ({ name, ok: null, detail: "Runs once genesis is recorded" }))).map((i) => (
              <Well key={i.name} className="flex items-start gap-3 p-3">
                <span
                  className={cx(
                    "mt-1 block size-3.5 flex-none border-3 border-black",
                    i.ok === true ? "animate-blink-slow bg-moss" : i.ok === false ? "bg-ember" : "bg-olive",
                  )}
                />
                <div>
                  <div className="text-[13px]">{INVARIANT_LABEL[i.name] ?? i.name}</div>
                  <div className="text-[11.5px] text-stone">
                    {i.ok === true ? "pass" : i.ok === false ? "FAIL" : "pending"} · {i.detail}
                  </div>
                </div>
              </Well>
            ))}
          </div>
          <FinePrint className="mt-3.5">
            Checked every 5 minutes (on-chain every 15). If any check fails, the site enters maintenance and the weekly batch is held automatically.
          </FinePrint>
        </Panel>

        <Panel tone="coal-2" className="p-5">
          <div className="mb-3.5 font-pixel text-2xl">Ledger pools</div>
          <div className="grid gap-2.5 text-[13px]">
            {data.pools.map((p) => {
              const pct = Number((BigInt(p.left) * 1000n) / (BigInt(p.ceiling) || 1n)) / 10;
              return (
                <div key={p.code}>
                  <div className="mb-1.5 flex justify-between gap-3">
                    <span className="text-dust">{p.label}</span>
                    <span className="text-gold-hi">
                      {fmt(p.left)} {p.code === "pool_liquidity" ? "locked" : "left"}
                    </span>
                  </div>
                  <Bar pct={pct} color={POOL_COLOR[p.code]} className="h-3" />
                </div>
              );
            })}
            <div className="mt-1 flex justify-between gap-3 text-[12.5px] text-stone">
              <span>Spent in game (burned)</span>
              <span>{fmt(data.sinkBurned)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[12.5px] text-stone">
              <span>Queued in this week&apos;s batch</span>
              <span>{fmt(data.payoutPending)}</span>
            </div>
          </div>
          <FinePrint className="mt-3.5">
            Pool ceilings are set once at genesis. Nothing can be topped up, and the liquidity pool stays locked until official trading.
          </FinePrint>
        </Panel>
      </div>

      <Panel className="p-5">
        <div className="mb-3 font-pixel text-2xl">Genesis registry</div>
        <div className="grid gap-2.5 text-[12.5px]">
          {(
            [
              ["Deploy txid", explorerLink(reg.explorer_base_url, "tx", reg.token_deploy_txid)],
              ["Mint txid", explorerLink(reg.explorer_base_url, "tx", reg.token_mint_txid)],
              ["Token inscription", explorerLink(reg.explorer_base_url, "inscription", reg.token_inscription_id)],
              ["Treasury address", explorerLink(reg.explorer_base_url, "address", reg.treasury_address)],
              ["Hot wallet (payout tranches)", explorerLink(reg.explorer_base_url, "address", reg.hot_wallet_address)],
              ["Whitelist Pass collection", explorerLink(reg.explorer_base_url, "inscription", reg.pass_collection_inscription_id ?? reg.pass_collection)],
            ] as const
          ).map(([label, value]) => (
            <Well key={label} className="p-3">
              <Label>{label}</Label>
              <div className="mt-0.5">{value}</div>
            </Well>
          ))}
          <Well className="flex flex-wrap justify-between gap-3 p-3">
            <span className="text-khaki">OFFICIAL INDEXER</span>
            <span>{data.token.indexer}</span>
          </Well>
        </div>
        {data.treasury.readAt ? <FinePrint className="mt-3">Treasury balance read from Zord {ago(data.treasury.readAt)} (cached 5 minutes).</FinePrint> : null}
      </Panel>
    </div>
  );
}
