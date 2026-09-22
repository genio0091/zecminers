"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { PublicReserves } from "@/lib/public-data";
import { ReservesView } from "../reserves-view";
import { Panel } from "../ui";

export function ProofTab() {
  const [data, setData] = useState<PublicReserves | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<PublicReserves>("/api/public/por").then((r) => (r.ok ? setData(r.data) : setErr(r.error.message)));
  }, []);
  if (err) return <Panel className="p-6 text-ember">{err}</Panel>;
  if (!data) return <Panel className="p-6 text-dust">Loading proof of reserves…</Panel>;
  return <ReservesView data={data} />;
}
