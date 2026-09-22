"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmt } from "@/lib/client-api";
import type { PublicReserves } from "@/lib/public-data";
import { Panel } from "../ui";

function Line({ label, value, tone = "text-gold-hi" }: { label: string; value: string; tone?: string }) {
  return (
    <Panel tone="ink" depth={5} className="flex flex-wrap justify-between gap-4 p-4">
      <span className="text-[13px] text-khaki">{label}</span>
      <strong className={`font-pixel text-xl font-normal ${tone}`}>{value}</strong>
    </Panel>
  );
}

/** The landing page's proof block: static facts, upgraded with live numbers when available. */
export function LiveReserves() {
  const [data, setData] = useState<PublicReserves | null>(null);
  useEffect(() => {
    api<PublicReserves>("/api/public/por").then((r) => r.ok && setData(r.data));
  }, []);
  const checks = data?.snapshot ? (data.snapshot.ok ? "Passing · every 5 min" : "FAILING — payouts held") : "Every 5 minutes";
  return (
    <div className="grid gap-3">
      <Line label="Minted at genesis" value="10,000,000,000" />
      <Line label="Holders after genesis" value="1 — the treasury" />
      <Line label="Settled payouts" value={data ? fmt(data.paidOut) : "—"} />
      <Line label="Reserve checks" value={checks} tone={data?.snapshot?.ok === false ? "text-ember" : "text-moss"} />
      <Line label="Official indexer" value="Zord, self-hosted" />
      <p className="m-0 mt-1 text-[12.5px] text-stone">
        The treasury address and the genesis transaction IDs are published the moment Phase 0 is confirmed on-chain.{" "}
        <Link href="/proof-of-reserves">Open the live proof of reserves ▸</Link>
      </p>
    </div>
  );
}
