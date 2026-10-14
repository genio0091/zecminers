import type { Metadata } from "next";
import { ReservesView } from "@/components/reserves-view";
import { Panel, SectionTitle } from "@/components/ui";
import { publicReserves, type PublicReserves } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Proof of reserves",
  description: "The $VALLEY treasury, every settled payout, the five ledger pools and the reserve checks that gate weekly payouts.",
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
      <SectionTitle as="h1" kicker="Proof of reserves" kickerColor="text-moss" title="EVERY $VALLEY, ACCOUNTED FOR">
        Before a payout, every in-game $VALLEY is backed 1:1 by the treasury. This page compares the treasury balance read from our own indexer with the ledger and
        every settled payout, so anyone can check that what Valley HQ shows is really there.
      </SectionTitle>
      {data ? (
        <ReservesView data={data} />
      ) : (
        <Panel className="p-6 text-dust">
          Live numbers are unavailable right now{error ? ` (${error})` : ""}. The treasury address and genesis transaction IDs are published here the moment genesis
          is confirmed on-chain.
        </Panel>
      )}
      <Panel tone="coal-2" className="grid gap-2 p-6 text-sm text-dust">
        <div className="font-pixel text-[32px] leading-none text-cream">HOW TO CHECK IT YOURSELF</div>
        <ol className="m-0 grid gap-1.5 pl-5">
          <li>Look up the token in the genesis registry above: max supply 10,000,000,000, fully minted to the treasury address.</li>
          <li>Read the treasury and hot-wallet balances. Their sum should equal 10,000,000,000 minus the settled payouts shown here.</li>
          <li>Each weekly payout is a public transfer to the player&apos;s pass address, listed with its transaction ID in Valley HQ.</li>
          <li>The machine-readable data is at <a href="/api/public/por">/api/public/por</a> and <a href="/api/public/token">/api/public/token</a>.</li>
        </ol>
        <p className="m-0 mt-2 text-xs text-stone">Nothing here is financial advice or a promise of value.</p>
      </Panel>
    </div>
  );
}
