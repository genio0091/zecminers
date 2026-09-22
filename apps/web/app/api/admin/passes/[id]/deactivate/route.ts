import { deactivatePass } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Deactivate a pass in the game. The inscription stays on-chain. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  deactivatePass(ctx.db, { adminId: requireUser(ctx).id, passId: ctx.params.id!, reason: ctx.body.reason }),
);
