import { importPasses } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { serverEnv } from "@/lib/env";

const Body = z.object({
  /** One winner per line: `t1address[,inscriptionId][,note]` */
  lines: z.string().max(200_000),
  dryRun: z.boolean().default(true),
  reason: z.string().trim().min(3).max(300),
});

/** Import winners and generate one-time claim codes. Plain codes are returned only in this response. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) => {
  const lines = ctx.body.lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [address = "", inscriptionId, ...note] = l.split(",").map((s) => s.trim());
      return { address, inscriptionId: inscriptionId || undefined, note: note.join(",") || undefined };
    });
  return importPasses(ctx.db, {
    adminId: requireUser(ctx).id,
    lines,
    reason: ctx.body.reason,
    pepper: serverEnv.claimCodePepper,
    network: serverEnv.network,
    dryRun: ctx.body.dryRun,
  });
});
