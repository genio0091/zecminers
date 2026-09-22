"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmt } from "@/lib/client-api";
import type { PublicReserves } from "@/lib/public-data";
import { Panel } from "../ui";

function Line({ label, value, tone = "text-gold-hi", compact }: { label: string; value: string; tone?: string; compact?: boolean }) {
  return (
    <Panel tone="ink" depth={compact ? 3 : 5} className={compact ? "flex flex-wrap justify-between gap-x-4 px-3 py-2 sm:p-4 short:sm:py-2" : "flex flex-wrap justify-between gap-4 p-4"}>
      <span className="text-[12.5px] text-khaki sm:text-[13px]">{label}</span>
      <strong className={`font-pixel text-lg font-normal sm:text-xl ${tone}`}>{value}</strong>
    </Panel>
  );
}

/** The landing page's proof block: static facts, upgraded with live numbers when available. */
export function LiveReserves({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<PublicReserves | null>(null);
  useEffect(() => {
    api<PublicReserves>("/api/public/por").then((r) => r.ok && setData(r.data));
  }, []);
  const checks = data?.snapshot ? (data.snapshot.ok ? "Passing · every 5 min" : "FAILING — payouts held") : "Every 5 minutes";
  return (
    <div className={compact ? "grid gap-2 sm:gap-3 short:sm:gap-2" : "grid gap-3"}>
      <Line compact={compact} label="Minted at genesis" value="10,000,000,000" />
      <Line compact={compact} label="Holders after genesis" value="1 — the treasury" />
      <Line compact={compact} label="Settled payouts" value={data ? fmt(data.paidOut) : "—"} />
      <Line compact={compact} label="Reserve checks" value={checks} tone={data?.snapshot?.ok === false ? "text-ember" : "text-moss"} />
      <Line compact={compact} label="Official indexer" value="Zord, self-hosted" />
      <p className="m-0 mt-1 text-[12px] text-stone sm:text-[12.5px]">
        The treasury address and the genesis transaction IDs are published the moment Phase 0 is confirmed on-chain.{" "}
        <Link href="/proof-of-reserves">Open the live proof of reserves ▸</Link>
      </p>
    </div>
  );
}
