import { getDb } from "@hoodvalley/db";
import { redirect } from "next/navigation";
import { Book } from "@/components/site/book/book";
import { ClaimOffice } from "@/components/site/claim/office";
import { claimNotices, claimView, loadGateConfig, siteAccess, socialLinks } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

/**
 * New visitors meet the Claim Office; a permit in progress continues at /waitlist. Once the claim
 * is filed (or for signed-in Valley HQ players and the team) the site is the Field Journal.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ x?: string; discord?: string }> }) {
  const db = getDb();
  const [{ open, entry }, config] = [await siteAccess(db), await loadGateConfig(db)];
  if (!open) {
    const view = claimView(entry, config);
    if (view.screen !== "gate") redirect("/waitlist");
    return <ClaimOffice view={view} siteOpen={false} notices={claimNotices(await searchParams)} links={socialLinks(config)} />;
  }
  const claim = entry?.unlockedAt ? { memberNo: entry.memberNo, handle: entry.xUsername ?? entry.handle, wallet: entry.wallet } : null;
  return <Book claim={claim} links={socialLinks(config)} />;
}
