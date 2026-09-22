import { GameError, isUniqueViolation, tables } from "@zecminers/db";
import { ADDRESS_ERROR_MESSAGES, checkTransparentAddress } from "@zecminers/zcash";
import { z } from "zod";
import { route } from "@/lib/api";
import { serverEnv } from "@/lib/env";

const Body = z.object({
  handle: z.string().trim().min(2).max(40),
  address: z.string().trim().min(26).max(40),
  tasks: z.object({ follow: z.literal(true), retweet: z.literal(true), tweet: z.literal(true) }),
});

/** Pass waitlist. Passes are airdropped, never sold. */
export const POST = route(
  { access: "public", mutation: true, body: Body, turnstile: true, rate: { name: "waitlist", limit: 5, windowSec: 600 } },
  async ({ db, body }) => {
    const check = checkTransparentAddress(body.address, { network: serverEnv.network });
    if (!check.ok) throw new GameError("INVALID_ADDRESS", ADDRESS_ERROR_MESSAGES[check.reason]);
    try {
      await db.insert(tables.waitlist).values({ handle: body.handle, address: body.address, tasks: body.tasks });
    } catch (err) {
      if (isUniqueViolation(err)) return { joined: true, already: true };
      throw err;
    }
    return { joined: true, already: false };
  },
);
