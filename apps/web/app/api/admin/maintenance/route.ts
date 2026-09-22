import { toggleMaintenance } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ on: z.boolean(), reason: z.string().trim().min(3).max(300) });

/** Maintenance switch: every balance mutation returns MAINTENANCE within seconds. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  toggleMaintenance(ctx.db, { adminId: requireUser(ctx).id, on: ctx.body.on, reason: ctx.body.reason }),
);
