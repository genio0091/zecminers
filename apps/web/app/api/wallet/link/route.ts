import { linkWallet } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { serverEnv } from "@/lib/env";

const Body = z.object({
  address: z.string().trim().min(26).max(40),
  claimCode: z.string().trim().min(8).max(20),
});

/** Link the airdrop address with the one-time claim code. Turnstile + 5/min (blueprint §9.1). */
export const POST = route(
  { access: "user", mutation: true, body: Body, turnstile: true, rate: { name: "wallet-link", limit: 5, windowSec: 60 } },
  async (ctx) =>
    linkWallet(ctx.db, {
      userId: requireUser(ctx).id,
      address: ctx.body.address,
      claimCode: ctx.body.claimCode,
      pepper: serverEnv.claimCodePepper,
      network: serverEnv.network,
      maxPassesPerAccount: serverEnv.maxPassesPerAccount,
      now: ctx.now,
    }),
);
