import { setPassInscription } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({ inscriptionId: z.string().trim().min(8).max(100), reason: z.string().trim().min(3).max(300) });

/** Record the ZRC-721 inscription id once the pass has been minted to its origin address. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  setPassInscription(ctx.db, { adminId: requireUser(ctx).id, passId: ctx.params.id!, inscriptionId: ctx.body.inscriptionId, reason: ctx.body.reason }),
);
