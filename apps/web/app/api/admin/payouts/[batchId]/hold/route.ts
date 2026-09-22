import { holdBatch } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  holdBatch(ctx.db, { batchId: ctx.params.batchId!, adminId: requireUser(ctx).id, reason: ctx.body.reason }),
);
