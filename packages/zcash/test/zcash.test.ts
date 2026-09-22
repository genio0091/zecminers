import { describe, expect, it } from "vitest";
import {
  base58CheckDecode,
  base58CheckEncode,
  checkTransparentAddress,
  encodeTransparentAddress,
  estimateHeightAt,
  expiryHeight,
  genesisPayloads,
  isFinal,
  zatsToZec,
  zip317Fee,
  zrc721Mint,
} from "../src";

const hash = Uint8Array.from({ length: 20 }, (_, i) => i + 1);

describe("transparent addresses", () => {
  it("encodes t1 / t3 / tm prefixes", () => {
    expect(encodeTransparentAddress(hash).startsWith("t1")).toBe(true);
    expect(encodeTransparentAddress(hash, "mainnet", "p2sh").startsWith("t3")).toBe(true);
    expect(encodeTransparentAddress(hash, "testnet").startsWith("tm")).toBe(true);
  });

  it("round-trips base58check", () => {
    const payload = Uint8Array.from([0x1c, 0xb8, ...hash]);
    expect(base58CheckDecode(base58CheckEncode(payload))).toEqual(payload);
  });

  it("accepts a valid t1 and rejects a flipped character", () => {
    const addr = encodeTransparentAddress(hash);
    expect(checkTransparentAddress(addr)).toMatchObject({ ok: true, kind: "p2pkh", network: "mainnet" });
    const last = addr.at(-1) === "a" ? "b" : "a";
    expect(checkTransparentAddress(addr.slice(0, -1) + last)).toEqual({ ok: false, reason: "checksum" });
  });

  it("rejects the wrong network and P2SH by default", () => {
    expect(checkTransparentAddress(encodeTransparentAddress(hash, "testnet"))).toEqual({ ok: false, reason: "network" });
    expect(checkTransparentAddress(encodeTransparentAddress(hash, "mainnet", "p2sh"))).toEqual({ ok: false, reason: "kind" });
    expect(checkTransparentAddress("zs1notatransparentaddress")).toEqual({ ok: false, reason: "format" });
  });
});

describe("ZIP 317", () => {
  it("charges at least two actions", () => {
    expect(zip317Fee({ txInTotalSize: 148, txOutTotalSize: 34 })).toBe(10_000);
  });
  it("grows with inscription payload size", () => {
    expect(zip317Fee({ txInTotalSize: 150, txOutTotalSize: 34 + 120 })).toBe(25_000);
  });
  it("formats zats", () => {
    expect(zatsToZec(10_000)).toBe("0.0001");
    expect(zatsToZec(100_000_000)).toBe("1");
  });
});

describe("genesis payloads", () => {
  it("match the byte sizes in the blueprint", () => {
    const g = genesisPayloads();
    expect(g.deploy.payload).toBe('{"p":"zrc-20","op":"deploy","tick":"ZGEMS","max":"10000000000","lim":"10000000000"}');
    expect(g.deploy.bytes).toBe(83);
    expect(g.deploy.exceedsOpReturnStandard).toBe(true);
    expect(g.deployWithoutLim.bytes).toBe(63);
    expect(g.mint.bytes).toBe(61);
    expect(zrc721Mint("ZMPASS", "0")).toBe('{"p":"zrc-721","op":"mint","collection":"ZMPASS","id":"0"}');
  });
});

describe("finality", () => {
  it("needs 12 confirmations before NU7 and 36 after", () => {
    expect(isFinal(100, 111, null)).toBe(true);
    expect(isFinal(100, 110, null)).toBe(false);
    expect(isFinal(1000, 1034, 900)).toBe(false);
    expect(isFinal(1000, 1035, 900)).toBe(true);
  });

  it("scales expiry and height estimates with block time", () => {
    expect(expiryHeight(1000, null)).toBe(1040);
    expect(expiryHeight(1000, 900)).toBe(1120);
    const now = new Date("2026-09-22T00:00:00Z");
    expect(estimateHeightAt(100, new Date(now.getTime() + 750_000), now, null)).toBe(110);
  });
});
