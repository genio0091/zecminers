import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { POOL_ALLOCATION, SEASON_1_DAILY_POOL, TOTAL_SUPPLY } from "@hoodvalley/economy";
import { describe, expect, it } from "vitest";
import { ALLOCATION, DAILY_POOL_TEXT } from "./content";

/**
 * The public site must match the litepaper: a fixed 10B supply split 70/15/8/5/2, and no
 * claim that $VALLEY can't move (it is a normal transferable token once it is in a wallet).
 */
const FORBIDDEN = [/can(?:no|')t be traded/i, /cannot be traded/i, /not tradable/i, /untradable/i, /guaranteed (?:return|profit|yield)/i];
// (this file is excluded from the scan because it lists the phrases)

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "node_modules" || f === ".next" ? [] : files(p);
    return /\.(tsx?|mdx?)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });
}

describe("public wording", () => {
  it("keeps the 70/15/8/5/2 allocation from the litepaper and the ledger", () => {
    expect(ALLOCATION.map((a) => a.share)).toEqual([70, 15, 8, 5, 2]);
    expect(ALLOCATION.reduce((sum, a) => sum + a.amount, 0)).toBe(Number(TOTAL_SUPPLY));
    for (const a of ALLOCATION) expect(BigInt(a.amount)).toBe(POOL_ALLOCATION[a.code]);
  });

  it("quotes the same daily pool as the economy", () => {
    expect(DAILY_POOL_TEXT).toBe(SEASON_1_DAILY_POOL.toLocaleString("en-US"));
  });

  it("never claims the token can't be traded or promises returns", () => {
    const root = new URL("..", import.meta.url).pathname;
    for (const file of [...files(join(root, "app")), ...files(join(root, "components")), ...files(join(root, "lib"))]) {
      const text = readFileSync(file, "utf8");
      for (const re of FORBIDDEN) expect(re.test(text), `${file} matches ${re}`).toBe(false);
    }
  });

  it("no longer mentions the old brand", () => {
    const root = new URL("..", import.meta.url).pathname;
    for (const file of [...files(join(root, "app")), ...files(join(root, "components")), ...files(join(root, "lib"))]) {
      const text = readFileSync(file, "utf8");
      expect(/ZecMiners|\$ZGEMS/.test(text), `${file} still says ZecMiners/$ZGEMS`).toBe(false);
    }
  });
});
