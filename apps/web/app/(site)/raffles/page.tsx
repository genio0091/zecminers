import type { Metadata } from "next";
import Link from "next/link";
import { getDb, listRaffles } from "@hoodvalley/db";
import { Label, Panel, SectionTitle, cx } from "@/components/ui";
import { fmt, short } from "@/lib/format";

export const metadata: Metadata = { title: "Raffles — provably fair", description: "Every Hood Valley holder raffle with its seed commitment, draw block and winners." };
export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  let raffles: Awaited<ReturnType<typeof listRaffles>> = [];
  try {
    raffles = await listRaffles(getDb(), 50);
  } catch {
    raffles = [];
  }
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-24 pt-12 sm:px-6">
      <SectionTitle as="h1" kicker="Holder raffles · 8% community allocation" title="PROVABLY FAIR, RECOMPUTABLE BY ANYONE">
        When a raffle opens we publish sha256 of a secret seed and the block height of the draw. After that block exists, we reveal the seed and anyone can
        recompute the winners from the published entries.
      </SectionTitle>
      {raffles.length === 0 ? (
        <Panel className="p-6 text-dust">No raffles yet. The first holder draw opens with Season 1.</Panel>
      ) : (
        <div className="grid gap-4">
          {raffles.map((r) => (
            <Link key={r.id} href={`/raffles/${r.id}`} className="block text-cream hover:text-cream">
              <Panel depth={5} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 p-4 hover:bg-coal-hover">
                <div>
                  <Label>#{r.id}</Label>
                  <div className="font-pixel text-2xl leading-none">{r.title.toUpperCase()}</div>
                </div>
                <div><Label>Status</Label><div className={cx(r.status === "open" ? "text-moss" : r.status === "drawn" ? "text-gold-hi" : "text-dust")}>{r.status.toUpperCase()}</div></div>
                <div><Label>Draw block</Label><div>{fmt(r.closeBlockHeight)}</div></div>
                <div><Label>Entries</Label><div>{fmt(r.totalTickets)}</div></div>
                <div><Label>Seed commitment</Label><div className="text-[12.5px]">{short(r.seedHash, 10, 6)}</div></div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
