import { isUniqueViolation, tables } from "@hoodvalley/db";
import { z } from "zod";
import { route } from "@/lib/api";

const TASKS = "Finish all three tasks first.";
const done = z.literal(true, { error: TASKS });

const Body = z.object({
  handle: z.string().trim().min(2, "Add the handle we should reach you on.").max(40),
  address: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "That doesn't look like a wallet address. It should start with 0x followed by 40 characters."),
  tasks: z.object({ follow: done, discord: done, repost: done }, { error: TASKS }),
});

/** Allowlist for the Valley Miners mint. Addresses are stored lower-case so each wallet joins once. */
export const POST = route(
  { access: "public", mutation: true, body: Body, turnstile: true, rate: { name: "waitlist", limit: 5, windowSec: 600 } },
  async ({ db, body }) => {
    try {
      await db.insert(tables.waitlist).values({ handle: body.handle, address: body.address.toLowerCase(), tasks: body.tasks });
    } catch (err) {
      if (isUniqueViolation(err)) return { joined: true, already: true };
      throw err;
    }
    return { joined: true, already: false };
  },
);
