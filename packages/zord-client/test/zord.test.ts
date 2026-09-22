import { describe, expect, it } from "vitest";
import { IndexerError, MockIndexer, ZordClient } from "../src";

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const key = url.pathname + url.search;
    if (!(key in routes)) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

describe("ZordClient", () => {
  const client = new ZordClient({
    baseUrl: "http://zord.internal:3000",
    fetch: fakeFetch({
      "/api/v1/status": { height: 3481234 },
      "/api/v1/tokens/ZGEMS": { data: { tick: "ZGEMS", max: "10000000000", minted: "10000000000", holders: 1, deploy_txid: "ab" } },
      "/api/v1/tokens/ZGEMS/balances/t1abc": { balance: "9998412905" },
      "/inscription/i1": { owner: "t1abc", location: "tx:0", content: '{"p":"zrc-721","op":"mint"}' },
      "/api/v1/inscriptions?outpoint=tx%3A1": { items: [{ id: "i9" }] },
      "/api/v1/inscriptions?outpoint=tx%3A2": { unexpected: true },
    }),
  });

  it("maps token, balance and status", async () => {
    expect(await client.status()).toMatchObject({ height: 3481234 });
    expect(await client.token("ZGEMS")).toMatchObject({ max: 10_000_000_000n, minted: 10_000_000_000n, holders: 1, deployTxid: "ab" });
    expect(await client.balance("t1abc", "ZGEMS")).toBe(9_998_412_905n);
    expect(await client.balance("t1none", "ZGEMS")).toBe(0n);
  });

  it("reads inscription owners", async () => {
    expect(await client.inscription("i1")).toMatchObject({ owner: "t1abc", outpoint: "tx:0", body: { p: "zrc-721" } });
    expect(await client.inscription("missing")).toBeNull();
  });

  it("refuses to assume a UTXO is clean when the shape is unknown", async () => {
    expect(await client.utxoInscriptions("tx:1")).toEqual(["i9"]);
    await expect(client.utxoInscriptions("tx:2")).rejects.toBeInstanceOf(IndexerError);
  });
});

describe("MockIndexer", () => {
  it("stores balances and owners", async () => {
    const m = new MockIndexer();
    m.setBalance("t1x", "ZGEMS", 5n);
    m.setInscriptionOwner("p1", "t1x");
    expect(await m.balance("t1x", "ZGEMS")).toBe(5n);
    expect((await m.inscription("p1"))?.owner).toBe("t1x");
  });
});
