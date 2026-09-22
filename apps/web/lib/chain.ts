import "server-only";
import { DbMockIndexer, getDb, type JobContext } from "@zecminers/db";
import { indexerFromEnv, zebraFromEnv, type ChainIndexer, type ZebraRpc } from "@zecminers/zord-client";
import { serverEnv } from "./env";

let cached: { indexer: ChainIndexer; zebra: ZebraRpc | null } | null = null;

/** Server-side chain clients. The browser never talks to Zord or Zebra (blueprint §5). */
export function chain(): JobContext {
  if (!cached) {
    const db = getDb();
    cached = {
      indexer: serverEnv.chainMode === "mock" ? new DbMockIndexer(db) : indexerFromEnv(),
      zebra: serverEnv.chainMode === "mock" ? null : zebraFromEnv(),
    };
  }
  return { db: getDb(), indexer: cached.indexer, zebra: cached.zebra, chainMode: serverEnv.chainMode };
}

const ttlCache = new Map<string, { at: number; value: unknown }>();

/** Small per-instance TTL cache for chain reads (Zord data is cached 5 min, blueprint §6.5). */
export async function cachedChainRead<T>(key: string, ttlMs: number, read: () => Promise<T>): Promise<T> {
  const hit = ttlCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await read();
  ttlCache.set(key, { at: Date.now(), value });
  return value;
}
