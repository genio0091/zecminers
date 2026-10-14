import { listUnlockedWaitlist } from "@hoodvalley/db";
import { route } from "@/lib/api";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of everyone through the gate, in line order — the mint allowlist. */
export const GET = route({ access: "admin" }, async (ctx) => {
  const rows = await listUnlockedWaitlist(ctx.db);
  const csv = [
    "member_no,x_handle,x_verified,wallet,tasks,unlocked_at",
    ...rows.map((r) =>
      [r.memberNo, r.xUsername ?? r.handle, r.xVerified ? "yes" : "no", r.wallet, Object.keys(r.tasks).join(" "), r.unlockedAt?.toISOString()].map(cell).join(","),
    ),
  ].join("\n");
  return new Response(`${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="hood-valley-waitlist.csv"`,
      "cache-control": "no-store",
    },
  });
});
