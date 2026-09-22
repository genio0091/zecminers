import "server-only";
import type Redis from "ioredis";
import { serverEnv } from "./env";

/**
 * Fixed-window rate limit (blueprint §7.7, §9.2). Redis when REDIS_URL is set (Upstash works),
 * otherwise an in-process map — fine for dev, per-instance only in production.
 */
const memory = new Map<string, { count: number; resetAt: number }>();
let redis: Redis | null | undefined;

async function getRedis(): Promise<Redis | null> {
  if (redis !== undefined) return redis;
  if (!serverEnv.redisUrl) return (redis = null);
  const { default: IORedis } = await import("ioredis");
  redis = new IORedis(serverEnv.redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
  redis.on("error", () => {});
  return redis;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetSeconds: number;
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const r = await getRedis();
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  if (r) {
    try {
      const n = await r.incr(bucket);
      if (n === 1) await r.expire(bucket, windowSec + 1);
      return { ok: n <= limit, remaining: Math.max(0, limit - n), resetSeconds: windowSec };
    } catch {
      // fall through to memory if Redis is unreachable
    }
  }
  const now = Date.now();
  const cur = memory.get(bucket);
  if (!cur || cur.resetAt < now) {
    memory.set(bucket, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
    }
    return { ok: true, remaining: limit - 1, resetSeconds: windowSec };
  }
  cur.count++;
  return { ok: cur.count <= limit, remaining: Math.max(0, limit - cur.count), resetSeconds: Math.ceil((cur.resetAt - now) / 1000) };
}
