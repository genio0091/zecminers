import { approveBatch } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Human approval of the weekly batch. Refused while maintenance is on or a reserve check failed. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  approveBatch(ctx.db, { batchId: ctx.params.batchId!, adminId: requireUser(ctx).id, reason: ctx.body.reason }),
);
