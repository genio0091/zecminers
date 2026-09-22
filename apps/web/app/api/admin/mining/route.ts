import { setMiningHalted } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ halted: z.boolean(), reason: z.string().trim().min(3).max(300) });

export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  setMiningHalted(ctx.db, { adminId: requireUser(ctx).id, on: ctx.body.halted, reason: ctx.body.reason }),
);
