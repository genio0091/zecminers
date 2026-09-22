/**
 * ZRC-20 / ZRC-721 payload builders (blueprint §3.1, §6.2, §6.7).
 * Payloads are minified JSON with integer strings; ZRC-20 has no decimals field.
 * The carrier encoding itself (OP_RETURN vs. script envelope) must be verified against
 * the zatoshilabs/zord source at M0 — see blueprint §3.3 item 1.
 */
export const OP_RETURN_STANDARD_LIMIT = 80;

const TICK_RE = /^[A-Za-z0-9]{1,16}$/;
const INT_RE = /^[1-9]\d*$/;

function assertInt(name: string, value: string) {
  if (!INT_RE.test(value)) throw new Error(`${name} must be a positive integer string`);
}

export function zrc20Deploy(tick: string, max: string, lim?: string): string {
  if (!TICK_RE.test(tick)) throw new Error("invalid tick");
  assertInt("max", max);
  if (lim !== undefined) assertInt("lim", lim);
  const body: Record<string, string> = { p: "zrc-20", op: "deploy", tick, max };
  if (lim !== undefined) body.lim = lim;
  return JSON.stringify(body);
}

export function zrc20Mint(tick: string, amt: string): string {
  if (!TICK_RE.test(tick)) throw new Error("invalid tick");
  assertInt("amt", amt);
  return JSON.stringify({ p: "zrc-20", op: "mint", tick, amt });
}

export function zrc20Transfer(tick: string, amt: string): string {
  if (!TICK_RE.test(tick)) throw new Error("invalid tick");
  assertInt("amt", amt);
  return JSON.stringify({ p: "zrc-20", op: "transfer", tick, amt });
}

export function zrc721Deploy(collection: string, supply: string, metaCid: string): string {
  if (!TICK_RE.test(collection)) throw new Error("invalid collection");
  assertInt("supply", supply);
  if (!/^[a-zA-Z0-9]{20,100}$/.test(metaCid)) throw new Error("invalid IPFS CID");
  return JSON.stringify({ p: "zrc-721", op: "deploy", collection, supply, meta: metaCid });
}

export function zrc721Mint(collection: string, id: string): string {
  if (!TICK_RE.test(collection)) throw new Error("invalid collection");
  if (!/^(0|[1-9]\d*)$/.test(id)) throw new Error("id must be a non-negative integer string");
  return JSON.stringify({ p: "zrc-721", op: "mint", collection, id });
}

export function payloadBytes(payload: string): number {
  return new TextEncoder().encode(payload).length;
}

export interface PayloadReport {
  payload: string;
  bytes: number;
  exceedsOpReturnStandard: boolean;
}

export function describePayload(payload: string): PayloadReport {
  const bytes = payloadBytes(payload);
  return { payload, bytes, exceedsOpReturnStandard: bytes > OP_RETURN_STANDARD_LIMIT };
}

/** The Phase 0 genesis payloads, exactly as in blueprint §6.2. */
export function genesisPayloads(tick = "ZGEMS", supply = "10000000000") {
  return {
    deploy: describePayload(zrc20Deploy(tick, supply, supply)),
    deployWithoutLim: describePayload(zrc20Deploy(tick, supply)),
    mint: describePayload(zrc20Mint(tick, supply)),
  };
}
