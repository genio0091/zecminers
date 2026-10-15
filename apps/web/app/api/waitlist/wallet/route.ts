import { setWaitlistWallet } from "@hoodvalley/db";
import { z } from "zod";
import { route } from "@/lib/api";
import { gateEntryId } from "@/lib/waitlist-route";

const Body = z.object({ address: z.string().trim().max(64).nullable() });

/** Links, changes or (with `null`) unlinks the EVM wallet on the permit. One permit per wallet. */
export const POST = route(
  { access: "public", mutation: true, allowDuringMaintenance: true, body: Body, rate: { name: "waitlist", limit: 20, windowSec: 600 } },
  async (ctx) => {
    const entry = await setWaitlistWallet(ctx.db, { entryId: gateEntryId(ctx.req), wallet: ctx.body.address, now: ctx.now });
    return { wallet: entry.wallet };
  },
);
