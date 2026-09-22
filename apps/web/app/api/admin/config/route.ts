import { publishEconomyConfig } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({
  params: z.unknown(),
  activeFrom: z.iso.datetime().optional(),
  reason: z.string().trim().min(3).max(300),
});

/** Publish a new economy config version. Old versions are never overwritten. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  publishEconomyConfig(ctx.db, {
    adminId: requireUser(ctx).id,
    params: ctx.body.params,
    activeFrom: ctx.body.activeFrom ? new Date(ctx.body.activeFrom) : undefined,
    reason: ctx.body.reason,
  }),
);
