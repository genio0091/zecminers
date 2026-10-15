import { getDb } from "@hoodvalley/db";
import type { Metadata } from "next";
import { ClaimOffice } from "@/components/site/claim/office";
import { claimNotices, claimView, loadGateConfig, siteAccess, socialLinks } from "@/lib/waitlist";

export const metadata: Metadata = { title: "The Claim Office", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The Claim Office in whatever state the visitor's permit is: not started, collecting stamps, or filed. */
export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ x?: string; discord?: string }> }) {
  const db = getDb();
  const [{ open, entry }, config] = [await siteAccess(db), await loadGateConfig(db)];
  return <ClaimOffice view={claimView(entry, config)} siteOpen={open} notices={claimNotices(await searchParams)} links={socialLinks(config)} />;
}
