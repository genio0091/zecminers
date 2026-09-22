import { freezeUser } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ frozen: z.boolean().default(true), reason: z.string().trim().min(3).max(300) });

export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  freezeUser(ctx.db, { adminId: requireUser(ctx).id, userId: ctx.params.id!, frozen: ctx.body.frozen, reason: ctx.body.reason }),
);
