export * from "./types";
export * from "./zord";
export * from "./zebra";
export * from "./mock";

import { MockIndexer } from "./mock";
import type { ChainIndexer } from "./types";
import { DEFAULT_ZORD_PATHS, ZordClient, type ZordPaths } from "./zord";
import { ZebraRpc } from "./zebra";

export type ChainMode = "mock" | "live";

/** Build clients from env. Keys: ZORD_MODE, ZORD_API_URL, ZORD_PATH_*, ZEBRA_RPC_URL/USER/PASSWORD. */
export function indexerFromEnv(env: Record<string, string | undefined> = process.env): ChainIndexer {
  const mode = (env.ZORD_MODE ?? "mock") as ChainMode;
  if (mode === "mock") return new MockIndexer();
  if (!env.ZORD_API_URL) throw new Error("ZORD_API_URL is required when ZORD_MODE=live");
  const paths: Partial<ZordPaths> = {};
  for (const key of Object.keys(DEFAULT_ZORD_PATHS) as (keyof ZordPaths)[]) {
    const v = env[`ZORD_PATH_${key.toUpperCase()}`];
    if (v) paths[key] = v;
  }
  return new ZordClient({ baseUrl: env.ZORD_API_URL, paths });
}

export function zebraFromEnv(env: Record<string, string | undefined> = process.env): ZebraRpc | null {
  if (!env.ZEBRA_RPC_URL) return null;
  return new ZebraRpc({ url: env.ZEBRA_RPC_URL, user: env.ZEBRA_RPC_USER, password: env.ZEBRA_RPC_PASSWORD });
}
