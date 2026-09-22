import "server-only";
import { DEV_ECONOMY_PARAMS, WEEKDAYS, type EconomyParams } from "@zecminers/economy";
import { getActiveConfig, getDb } from "@zecminers/db";

/** Live economy values for public pages, falling back to the dev example values. */
export async function siteConfig(): Promise<{ params: EconomyParams; payoutDay: string; version: number }> {
  let params = DEV_ECONOMY_PARAMS;
  let version = 0;
  if (process.env.DATABASE_URL) {
    try {
      const cfg = await Promise.race([
        getActiveConfig(getDb()),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000)),
      ]);
      params = cfg.params;
      version = cfg.version;
    } catch {
      // DB unreachable at build time — dev values are fine for static copy.
    }
  }
  return { params, payoutDay: WEEKDAYS[params.payout.weekday] ?? "Monday", version };
}
