import { generateTestPasses } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { serverEnv } from "@/lib/env";

const Body = z.object({
  count: z.number().int().min(1).max(500),
  label: z.string().trim().max(60).optional(),
  reason: z.string().trim().min(3).max(300),
});

/** Team/test logins: random t1 address + claim code each. Never paid out. Codes returned once. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  generateTestPasses(ctx.db, {
    adminId: requireUser(ctx).id,
    count: ctx.body.count,
    label: ctx.body.label,
    reason: ctx.body.reason,
    pepper: serverEnv.claimCodePepper,
    network: serverEnv.network,
  }),
);
