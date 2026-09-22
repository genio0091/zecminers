import { JOBS, type JobName } from "@zecminers/db";
import { NextResponse, type NextRequest } from "next/server";
import { chain } from "@/lib/chain";
import { serverEnv } from "@/lib/env";

export const maxDuration = 60;

/**
 * Entry point for the scheduled jobs. Called with `Authorization: Bearer $CRON_SECRET` by
 * .github/workflows/scheduled-jobs.yml (works on the Vercel Hobby plan), or by Vercel Cron on Pro.
 * On a VPS the pg-boss worker runs the same functions instead.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!serverEnv.cronSecret || req.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const def = JOBS[job as JobName];
  if (!def) return NextResponse.json({ ok: false, error: "unknown job" }, { status: 404 });
  const started = Date.now();
  try {
    const result = await def.run(chain());
    const body = JSON.stringify({ ok: true, job, ms: Date.now() - started, result }, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    return new NextResponse(body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (err) {
    console.error(`[cron:${job}]`, err);
    return NextResponse.json({ ok: false, job, error: (err as Error).message }, { status: 500 });
  }
}
