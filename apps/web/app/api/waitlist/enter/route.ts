import { unlockWaitlistEntry } from "@hoodvalley/db";
import { route } from "@/lib/api";
import { loadGateConfig, requiredTaskKeys, xOAuthEnabled } from "@/lib/waitlist";
import { gateEntryId } from "@/lib/waitlist-route";

/** "Enter the valley": everything is checked again here; the button state is only presentation. */
export const POST = route(
  { access: "public", mutation: true, allowDuringMaintenance: true, turnstile: true, rate: { name: "waitlist", limit: 10, windowSec: 600 } },
  async (ctx) => {
    const entry = await unlockWaitlistEntry(ctx.db, {
      entryId: gateEntryId(ctx.req),
      requiredTasks: requiredTaskKeys(await loadGateConfig(ctx.db)),
      requireXVerified: xOAuthEnabled,
      now: ctx.now,
    });
    return { memberNo: entry.memberNo };
  },
);
