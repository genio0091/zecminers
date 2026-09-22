/**
 * ZecMiners worker (blueprint §5.1): pg-boss queues in Postgres drive every scheduled job.
 * On Vercel the same job functions run from /api/cron/[job] instead — pick one, not both.
 *
 *   pnpm --filter @zecminers/worker start          # long-running worker
 *   pnpm --filter @zecminers/worker once invariants # run one job and exit
 */
import { PgBoss } from "pg-boss";
import { createDb, DbMockIndexer, JOBS, type JobContext, type JobName } from "@zecminers/db";
import { indexerFromEnv, zebraFromEnv } from "@zecminers/zord-client";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is required");
  process.exit(1);
}

const handle = createDb(url, 5);
const chainMode = process.env.ZORD_MODE === "live" ? "live" : "mock";
const ctx: JobContext = {
  db: handle.db,
  indexer: chainMode === "mock" ? new DbMockIndexer(handle.db) : indexerFromEnv(),
  zebra: chainMode === "mock" ? null : zebraFromEnv(),
  chainMode,
};

const log = (job: string, msg: string, extra?: unknown) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), job, msg, ...(extra !== undefined ? { extra } : {}) }, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

async function runOnce(name: string) {
  const def = JOBS[name as JobName];
  if (!def) throw new Error(`unknown job "${name}". Jobs: ${Object.keys(JOBS).join(", ")}`);
  const started = Date.now();
  const result = await def.run(ctx);
  log(name, "done", { ms: Date.now() - started, result });
}

const onceIdx = process.argv.indexOf("--once");
if (onceIdx >= 0) {
  const name = process.argv[onceIdx + 1];
  try {
    if (!name) throw new Error("usage: --once <job>");
    await runOnce(name);
  } finally {
    await handle.close();
  }
  process.exit(0);
}

const boss = new PgBoss({ connectionString: url, schema: "pgboss" });
boss.on("error", (err: unknown) => console.error("[pg-boss]", err));
await boss.start();

for (const [name, def] of Object.entries(JOBS)) {
  try {
    await boss.createQueue(name);
  } catch {
    // already exists
  }
  // Override any schedule with CRON_<JOB_NAME>, e.g. CRON_PAYOUT_CUTOFF="0 0 * * 1".
  const cron = process.env[`CRON_${name.toUpperCase().replace(/-/g, "_")}`] ?? def.cron;
  await boss.schedule(name, cron, null, { tz: "UTC" });
  await boss.work(name, async (jobs: unknown[]) => {
    for (const _job of jobs) {
      const started = Date.now();
      try {
        const result = await def.run(ctx);
        log(name, "ok", { ms: Date.now() - started, result });
      } catch (err) {
        log(name, "failed", { error: (err as Error).message });
        throw err; // let pg-boss retry per queue policy
      }
    }
  });
  log(name, `scheduled ${cron} UTC`);
}

log("worker", `started (chain=${chainMode})`);

async function shutdown(signal: string) {
  log("worker", `${signal} received, stopping`);
  await boss.stop({ graceful: true, timeout: 30_000 }).catch(() => {});
  await handle.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
