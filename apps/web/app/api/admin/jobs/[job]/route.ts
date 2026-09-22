import { audit, GameError, JOBS, type JobName } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { chain } from "@/lib/chain";

const Body = z.object({ reason: z.string().trim().min(3).max(300) });

/** Run any scheduled job on demand (e.g. payout-settle after the signer finished). */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) => {
  const def = JOBS[ctx.params.job as JobName];
  if (!def) throw new GameError("NOT_FOUND", "Unknown job.");
  await audit(ctx.db, { adminId: requireUser(ctx).id, action: `job.run ${ctx.params.job}`, payload: {}, reason: ctx.body.reason });
  return def.run(chain());
});
