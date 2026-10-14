import { GameError, startWithHandle } from "@hoodvalley/db";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { GATE_COOKIE, gateCookieOptions, signGateValue, verifyGateValue, xOAuthEnabled } from "@/lib/waitlist";

const Body = z.object({ handle: z.string().trim().min(1, "Enter your X handle, like @yourhandle.").max(20) });

/** Step 1 while X OAuth is not configured: start the waitlist with a self-reported X handle. */
export const POST = route(
  { access: "public", mutation: true, allowDuringMaintenance: true, body: Body, rate: { name: "waitlist", limit: 10, windowSec: 600 } },
  async (ctx) => {
    if (xOAuthEnabled) throw new GameError("VALIDATION", "Connect with X to start.");
    const entry = await startWithHandle(ctx.db, { entryId: verifyGateValue(ctx.req.cookies.get(GATE_COOKIE)?.value), handle: ctx.body.handle, now: ctx.now });
    const res = ok({ started: true }, ctx.now);
    res.cookies.set(GATE_COOKIE, signGateValue(entry.id), gateCookieOptions);
    return res;
  },
);
