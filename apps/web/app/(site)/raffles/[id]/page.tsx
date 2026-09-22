import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb, raffleVerification } from "@zecminers/db";
import { RaffleVerifier } from "@/components/raffle/verifier";
import { Label, Panel, SectionTitle, Well } from "@/components/ui";
import { fmt } from "@/lib/client-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Raffle #${id} verification` };
}

export default async function RaffleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raffleId = Number(id);
  if (!Number.isInteger(raffleId) || raffleId < 1) notFound();
  const v = await raffleVerification(getDb(), raffleId).catch(() => null);
  if (!v) notFound();
  const r = v.raffle;
  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pb-24 pt-12 sm:px-6">
      <SectionTitle as="h1" kicker={`Raffle #${r.id} · ${r.status.toUpperCase()}`} title={r.title} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <Panel className="grid gap-2.5 p-5 text-[13px]">
          {[
            ["Seed commitment · sha256(seed)", r.seedHash],
            ["Closing block height (H)", fmt(r.closeBlockHeight)],
            ["Hash of block H", r.blockHash ?? "Known once block H is mined"],
            ["Seed", r.seed ?? "Revealed after the draw"],
            ["Ticket price", `${fmt(r.ticketPrice)} $ZGEMS`],
            ["Prize", `${fmt(r.prizeAmount)} $ZGEMS · ${r.winnerCount} winner(s)`],
            ["Total tickets", fmt(r.totalTickets)],
          ].map(([k, val]) => (
            <Well key={k} className="p-3">
              <Label>{k}</Label>
              <div className="break-all">{val}</div>
            </Well>
          ))}
          {r.winners?.length ? (
            <Well className="p-3">
              <Label>Published winners</Label>
              {r.winners.map((w, i) => (
                <div key={w.index}>
                  {i + 1}. ticket #{w.index} · {fmt(w.prize)} $ZGEMS · <span className="text-stone">{w.userId}</span>
                </div>
              ))}
            </Well>
          ) : null}
        </Panel>
        <div className="grid content-start gap-5">
          <RaffleVerifier
            raffleId={r.id}
            seedHash={r.seedHash}
            seed={r.seed}
            blockHash={r.blockHash}
            totalTickets={r.totalTickets}
            winnerCount={r.winnerCount}
            published={r.winners}
            tickets={v.tickets}
          />
          <Panel tone="coal-2" className="p-5 text-[13px] text-dust">
            <div className="mb-2 font-pixel text-xl text-cream">Ticket ranges</div>
            <div className="grid max-h-[320px] gap-1 overflow-auto">
              {v.tickets.length === 0 ? <span>No tickets sold.</span> : null}
              {v.tickets.map((t) => (
                <div key={t.startIndex} className="flex justify-between gap-3 border-b-3 border-ink py-1">
                  <span>#{t.startIndex}–#{t.startIndex + t.count - 1}</span>
                  <span className="text-stone">{t.userId.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-2 text-xs text-stone">Machine-readable: <a href={`/api/public/raffles/${r.id}/verify`}>/api/public/raffles/{r.id}/verify</a></p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
