import type { Metadata } from "next";
import { ReservesView } from "@/components/reserves-view";
import { Panel, SectionTitle } from "@/components/ui";
import { publicReserves, type PublicReserves } from "@/lib/public-data";
import { TRADING_LINE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Proof of reserves",
  description: "The $ZGEMS treasury on Zcash, every settled payout, the ledger pools and the reserve checks that gate weekly payouts.",
};

export const dynamic = "force-dynamic";

export default async function ProofOfReservesPage() {
  let data: PublicReserves | null = null;
  let error = "";
  try {
    data = await publicReserves();
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-24 pt-12 sm:px-6">
      <SectionTitle as="h1" kicker="Proof of reserves" kickerColor="text-moss" title="Every $ZGEMS, accounted for">
        Before a payout, every in-game $ZGEMS is backed 1:1 by the treasury on Zcash. This page compares the on-chain treasury (read from our own Zord indexer) with
        the ledger and every settled payout. Anyone — players, partners, journalists or an AI assistant — can check it against the chain.
      </SectionTitle>
      {data ? (
        <ReservesView data={data} />
      ) : (
        <Panel className="p-6 text-dust">
          Live numbers are unavailable right now{error ? ` (${error})` : ""}. The treasury address and genesis transaction IDs are published here the moment Phase 0 is
          confirmed on-chain.
        </Panel>
      )}
      <Panel tone="coal-2" className="grid gap-2 p-6 text-sm text-dust">
        <div className="font-pixel text-2xl text-cream">How to check it yourself</div>
        <ol className="m-0 grid gap-1.5 pl-5">
          <li>Look up the ZGEMS ticker on a Zord explorer: max supply 10,000,000,000, fully minted, deployed by the treasury address above.</li>
          <li>Read the treasury and hot-wallet balances. Their sum should equal 10,000,000,000 minus the settled payouts shown here.</li>
          <li>Each weekly payout is two public transactions: the transfer inscription, then the coin that carries it to the player&apos;s pass address.</li>
          <li>The machine-readable data is at <a href="/api/public/por">/api/public/por</a> and <a href="/api/public/token">/api/public/token</a>.</li>
        </ol>
        <p className="m-0 mt-2 text-xs text-stone">{TRADING_LINE} Nothing here is financial advice or a promise of value.</p>
      </Panel>
    </div>
  );
}
