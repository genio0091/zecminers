import { getDb } from "@hoodvalley/db";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site/footer";
import { WaitlistGate } from "@/components/site/gate/gate";
import { SiteHeader } from "@/components/site/header";
import { Allowlist } from "@/components/site/landing/allowlist";
import { Benefits } from "@/components/site/landing/benefits";
import { DailyShift } from "@/components/site/landing/daily-shift";
import { Faq } from "@/components/site/landing/faq";
import { Hero } from "@/components/site/landing/hero";
import { Collection, Lore } from "@/components/site/landing/lore";
import { Roadmap } from "@/components/site/landing/roadmap";
import { SeasonOne } from "@/components/site/landing/season";
import { SeasonTwo } from "@/components/site/landing/season-two";
import { Tokenomics } from "@/components/site/landing/tokenomics";
import { gateTasks, loadGateConfig, siteAccess, xOAuthEnabled } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

/**
 * Visitors meet the waitlist gate first; once through it (or signed in to Valley HQ) they get the
 * full site: the valley from the surface down to bedrock, one stratum per section.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ x?: string }> }) {
  const db = getDb();
  const { open, entry } = await siteAccess(db);
  if (!open) {
    if (entry) redirect("/waitlist");
    const config = await loadGateConfig(db);
    return <WaitlistGate xEnabled={xOAuthEnabled} steps={gateTasks(null, config).length} error={(await searchParams).x} />;
  }
  return (
    <div className="bg-bedrock text-cream">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-80 focus:bg-gold focus:px-3 focus:py-2 focus:text-night">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Lore />
        <Collection />
        <DailyShift />
        <SeasonOne />
        <Benefits />
        <Tokenomics />
        <SeasonTwo />
        <Roadmap />
        <Allowlist
          xEnabled={xOAuthEnabled}
          status={entry?.unlockedAt ? { memberNo: entry.memberNo, handle: entry.xUsername ?? entry.handle, wallet: entry.wallet } : null}
        />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
