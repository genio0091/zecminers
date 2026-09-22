"use client";

import { drawWinners, seedCommitment, ticketOwner } from "@zecminers/economy";
import { useMemo, useState } from "react";
import { Button, Panel, Well } from "../ui";

interface Props {
  raffleId: number;
  seedHash: string;
  seed: string | null;
  blockHash: string | null;
  totalTickets: number;
  winnerCount: number;
  published: { index: number; userId: string }[] | null;
  tickets: { userId: string; startIndex: number; count: number }[];
}

/** Recomputes the draw locally from public data — no trust in our server needed. */
export function RaffleVerifier(p: Props) {
  const [seed, setSeed] = useState(p.seed ?? "");
  const [blockHash, setBlockHash] = useState(p.blockHash ?? "");
  const [run, setRun] = useState(false);
  type Outcome = { error: string } | { commitmentOk: boolean; winners: { index: number; owner: string | null }[] };
  const result = useMemo((): Outcome | null => {
    if (!run) return null;
    try {
      if (!/^[0-9a-f]{64}$/i.test(seed) || !/^[0-9a-f]{64}$/i.test(blockHash)) return { error: "Seed and block hash must be 64 hex characters." };
      const commitmentOk = seedCommitment(seed.toLowerCase()) === p.seedHash;
      if (p.totalTickets === 0) return { commitmentOk, winners: [] };
      const idx = drawWinners(seed.toLowerCase(), blockHash.toLowerCase(), p.raffleId, p.totalTickets, p.winnerCount);
      return { commitmentOk, winners: idx.map((index) => ({ index, owner: ticketOwner(p.tickets, index)?.userId ?? null })) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [run, seed, blockHash, p]);

  const matches =
    result && "winners" in result && p.published
      ? result.winners.length === p.published.length && result.winners.every((w, i) => w.index === p.published![i]!.index)
      : null;

  return (
    <Panel className="grid gap-3 p-5">
      <div className="font-pixel text-2xl">Recompute in your browser</div>
      <label className="grid gap-1 text-[11px] uppercase tracking-[1.5px] text-khaki">
        Seed (revealed after the draw)
        <input value={seed} onChange={(e) => { setSeed(e.target.value.trim()); setRun(false); }} className="border-3 border-black bg-ink px-3 py-2 font-mono text-[13px] normal-case tracking-normal text-cream" />
      </label>
      <label className="grid gap-1 text-[11px] uppercase tracking-[1.5px] text-khaki">
        Hash of the closing block
        <input value={blockHash} onChange={(e) => { setBlockHash(e.target.value.trim()); setRun(false); }} className="border-3 border-black bg-ink px-3 py-2 font-mono text-[13px] normal-case tracking-normal text-cream" />
      </label>
      <div>
        <Button onClick={() => setRun(true)} disabled={!seed || !blockHash}>Verify</Button>
      </div>
      {result ? (
        "error" in result ? (
          <p className="m-0 text-sm text-ember">{result.error}</p>
        ) : (
          <Well className="grid gap-1.5 p-3 text-[13px]">
            <div className={result.commitmentOk ? "text-moss" : "text-ember"}>
              {result.commitmentOk ? "✓ sha256(seed) matches the published commitment" : "✗ sha256(seed) does NOT match the commitment"}
            </div>
            {result.winners.map((w, i) => (
              <div key={w.index}>
                Winner {i + 1}: ticket #{w.index} <span className="text-stone">· holder {w.owner ?? "—"}</span>
              </div>
            ))}
            {matches !== null ? (
              <div className={matches ? "text-moss" : "text-ember"}>{matches ? "✓ Matches the published winners" : "✗ Differs from the published winners"}</div>
            ) : null}
          </Well>
        )
      ) : null}
      <p className="m-0 text-xs text-stone">
        winner = HMAC-SHA256(key = seed bytes, message = UTF-8(blockHashHex + raffleId)) mod totalTickets. Extra winners append &quot;:k&quot; to the message and skip repeats.
      </p>
    </Panel>
  );
}
