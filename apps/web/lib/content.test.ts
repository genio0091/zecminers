import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ, TRADING_LINE } from "./content";

/**
 * Blueprint §4.5: the approved wording is exactly
 *   "No liquidity pool at launch. Official trading starts after the NFT mint."
 * and the site must never claim the token can't be traded (AI tools check this against
 * the marketplaces).
 */
const FORBIDDEN = [/can(?:no|')t be traded/i, /cannot be traded/i, /not tradable/i, /untradable/i, /\bno trading\b/i, /tidak bisa di-?trade/i];
// (this file is excluded from the scan because it lists the phrases)

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "node_modules" || f === ".next" ? [] : files(p);
    return /\.(tsx?|mdx?)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });
}

describe("public wording", () => {
  it("uses the approved trading line", () => {
    expect(TRADING_LINE).toBe("No liquidity pool at launch. Official trading starts after the NFT mint.");
    expect(FAQ.find((f) => f.q === "Can $ZGEMS be traded?")?.a.startsWith(TRADING_LINE)).toBe(true);
  });

  it("never says the token can't be traded", () => {
    const root = new URL("..", import.meta.url).pathname;
    for (const file of [...files(join(root, "app")), ...files(join(root, "components")), ...files(join(root, "lib"))]) {
      const text = readFileSync(file, "utf8");
      for (const re of FORBIDDEN) expect(re.test(text), `${file} matches ${re}`).toBe(false);
    }
  });

  it("keeps the 80/10/5/5 allocation from the blueprint", async () => {
    const { ALLOCATION } = await import("./content");
    expect(ALLOCATION.map((a) => a.pct)).toEqual([80, 10, 5, 5]);
  });
});
