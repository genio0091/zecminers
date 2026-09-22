import { recordGenesis, REGISTRY_KEYS } from "@zecminers/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";

const Body = z.object({
  entries: z.record(z.enum(REGISTRY_KEYS), z.string().trim().max(200)),
  postLedgerGenesis: z.boolean().default(false),
  reason: z.string().trim().min(3).max(300),
});

/** Record Phase 0 facts (txids, inscription ids, treasury address) and post the genesis ledger once. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  recordGenesis(ctx.db, { adminId: requireUser(ctx).id, entries: ctx.body.entries, postLedgerGenesis: ctx.body.postLedgerGenesis, reason: ctx.body.reason }),
);
