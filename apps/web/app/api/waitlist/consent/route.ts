import { setWaitlistConsent } from "@hoodvalley/db";
import { z } from "zod";
import { route } from "@/lib/api";
import { gateEntryId } from "@/lib/waitlist-route";

const Body = z.object({ agreed: z.boolean() });

export const POST = route(
  { access: "public", mutation: true, allowDuringMaintenance: true, body: Body, rate: { name: "waitlist", limit: 30, windowSec: 600 } },
  async (ctx) => {
    const entry = await setWaitlistConsent(ctx.db, { entryId: gateEntryId(ctx.req), agreed: ctx.body.agreed, now: ctx.now });
    return { consent: !!entry.consentAt };
  },
);
