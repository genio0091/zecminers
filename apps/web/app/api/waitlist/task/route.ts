import { GameError, markWaitlistTask } from "@hoodvalley/db";
import { z } from "zod";
import { route } from "@/lib/api";
import { loadGateConfig, requiredTaskKeys } from "@/lib/waitlist";
import { gateEntryId } from "@/lib/waitlist-route";

const Body = z.object({ key: z.string().max(64) });

/** A social task the visitor clicked through. Self-attested and labelled as such ("Marked"). */
export const POST = route(
  { access: "public", mutation: true, allowDuringMaintenance: true, body: Body, rate: { name: "waitlist", limit: 30, windowSec: 600 } },
  async (ctx) => {
    if (!requiredTaskKeys(await loadGateConfig(ctx.db)).includes(ctx.body.key)) throw new GameError("VALIDATION", "That task is no longer available.");
    await markWaitlistTask(ctx.db, { entryId: gateEntryId(ctx.req), key: ctx.body.key, now: ctx.now });
    return { marked: ctx.body.key };
  },
);
