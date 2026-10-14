import { recentWaitlist, setGateConfig, waitlistStats } from "@hoodvalley/db";
import { z } from "zod";
import { requireUser, route } from "@/lib/api";
import { defaultGateConfig, loadGateConfig, xOAuthEnabled } from "@/lib/waitlist";

/** Waitlist gate: numbers, the live task config and the deploy defaults it falls back to. */
export const GET = route({ access: "admin" }, async (ctx) => {
  const recent = await recentWaitlist(ctx.db, 12);
  return {
    stats: await waitlistStats(ctx.db),
    config: await loadGateConfig(ctx.db),
    defaults: defaultGateConfig(),
    xOAuth: xOAuthEnabled,
    recent: recent.map((e) => ({
      handle: e.xUsername ?? e.handle,
      xVerified: !!e.xVerifiedAt,
      wallet: e.wallet,
      tasks: Object.keys(e.tasks).length,
      memberNo: e.memberNo,
      updatedAt: e.updatedAt.toISOString(),
    })),
  };
});

const Tweet = z.object({
  id: z.string().trim().min(1).max(32),
  kind: z.enum(["retweet", "like", "quote", "reply", "post"]),
  label: z.string().trim().min(2).max(80),
  url: z.string().trim().max(200).default(""),
  text: z.string().trim().max(240).optional(),
});
const Body = z.object({
  config: z.object({ xHandle: z.string().trim().max(16), discordInvite: z.string().trim().max(200), tweets: z.array(Tweet).max(8) }),
  reason: z.string().trim().min(3).max(300),
});

export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true, body: Body }, async (ctx) =>
  setGateConfig(ctx.db, {
    adminId: requireUser(ctx).id,
    config: { ...ctx.body.config, xHandle: ctx.body.config.xHandle.replace(/^@/, "") },
    reason: ctx.body.reason,
  }),
);
