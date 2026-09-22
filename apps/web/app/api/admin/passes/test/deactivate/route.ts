import { deactivateTestPasses } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Switch every test pass off (e.g. before launch). */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  deactivateTestPasses(ctx.db, { adminId: requireUser(ctx).id, reason: ctx.body.reason }),
);
