import { z } from "zod";
import { IndexerError, type ChainIndexer, type IndexerStatus, type InscriptionInfo, type TokenInfo } from "./types";

/**
 * HTTP client for a self-hosted Zord indexer.
 *
 * The public ZORD README names `/api/v1/tokens`, `/api/v1/inscriptions` and `/inscription/:id`
 * but does not document response shapes, and blueprint §3.3 says to treat the
 * zatoshilabs/zord source code as the real spec. So:
 *  - every path is a template you can override from env at M0 without a code change;
 *  - responses are parsed loosely and mapped through a few candidate field names;
 *  - anything that cannot be mapped throws instead of guessing.
 */
export interface ZordPaths {
  status: string;
  token: string;
  balance: string;
  inscription: string;
  utxo: string;
}

export const DEFAULT_ZORD_PATHS: ZordPaths = {
  status: "/api/v1/status",
  token: "/api/v1/tokens/{tick}",
  balance: "/api/v1/tokens/{tick}/balances/{address}",
  inscription: "/inscription/{id}",
  utxo: "/api/v1/inscriptions?outpoint={outpoint}",
};

export interface ZordClientOptions {
  baseUrl: string;
  paths?: Partial<ZordPaths>;
  timeoutMs?: number;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

const loose = z.record(z.string(), z.unknown());

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const parts = k.split(".");
    let cur: unknown = obj;
    for (const p of parts) {
      cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined;
    }
    if (cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

function toBigInt(v: unknown, field: string): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isSafeInteger(v)) return BigInt(v);
  if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
  throw new IndexerError(`Zord response: cannot read integer field "${field}"`);
}

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export class ZordClient implements ChainIndexer {
  private readonly paths: ZordPaths;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: ZordClientOptions) {
    this.paths = { ...DEFAULT_ZORD_PATHS, ...opts.paths };
    this.timeoutMs = opts.timeoutMs ?? 8_000;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  private url(template: string, vars: Record<string, string>): string {
    const path = template.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(vars[k] ?? ""));
    return new URL(path, this.opts.baseUrl).toString();
  }

  private async get(template: string, vars: Record<string, string> = {}): Promise<Record<string, unknown> | null> {
    const res = await this.fetchImpl(this.url(template, vars), {
      headers: { accept: "application/json", ...this.opts.headers },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new IndexerError(`Zord ${res.status} for ${template}`, res.status);
    const json: unknown = await res.json();
    const parsed = loose.safeParse(Array.isArray(json) ? { items: json } : json);
    if (!parsed.success) throw new IndexerError("Zord returned a non-object body");
    const data = parsed.data;
    return (data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data) ?? null;
  }

  async status(): Promise<IndexerStatus> {
    const body = await this.get(this.paths.status);
    if (!body) throw new IndexerError("Zord status endpoint not found");
    const height = pick(body, ["height", "indexed_height", "block_height", "latest_block", "tip.height"]);
    return {
      height: Number(toBigInt(height, "height")),
      blockTime: toStr(pick(body, ["block_time", "time", "timestamp", "tip.time"])),
    };
  }

  async token(tick: string): Promise<TokenInfo | null> {
    const body = await this.get(this.paths.token, { tick });
    if (!body) return null;
    return {
      tick: toStr(pick(body, ["tick", "ticker"])) ?? tick,
      max: toBigInt(pick(body, ["max", "max_supply", "supply"]), "max"),
      minted: toBigInt(pick(body, ["minted", "total_minted", "mint_progress.minted"]) ?? 0, "minted"),
      holders: Number(pick(body, ["holders", "holder_count", "holders_count"]) ?? 0),
      deployInscriptionId: toStr(pick(body, ["deploy_inscription", "inscription_id", "deploy.inscription_id"])),
      deployTxid: toStr(pick(body, ["deploy_txid", "txid", "deploy.txid"])),
    };
  }

  async balance(address: string, tick: string): Promise<bigint> {
    const body = await this.get(this.paths.balance, { tick, address });
    if (!body) return 0n;
    return toBigInt(pick(body, ["balance", "overall_balance", "total", "amount"]) ?? 0, "balance");
  }

  async inscription(id: string): Promise<InscriptionInfo | null> {
    const body = await this.get(this.paths.inscription, { id });
    if (!body) return null;
    const owner = toStr(pick(body, ["owner", "address", "owner_address", "current_owner"]));
    if (!owner) throw new IndexerError(`Zord inscription ${id}: no owner field`);
    const rawBody = pick(body, ["content", "body", "json"]);
    let parsedBody: Record<string, unknown> | null = null;
    if (rawBody && typeof rawBody === "object") parsedBody = rawBody as Record<string, unknown>;
    else if (typeof rawBody === "string") {
      try {
        const j: unknown = JSON.parse(rawBody);
        if (j && typeof j === "object") parsedBody = j as Record<string, unknown>;
      } catch {
        parsedBody = null;
      }
    }
    const h = pick(body, ["height", "block_height", "genesis_height"]);
    return {
      id,
      owner,
      outpoint: toStr(pick(body, ["outpoint", "location", "output", "satpoint"])),
      height: typeof h === "number" ? h : typeof h === "string" && /^\d+$/.test(h) ? Number(h) : null,
      contentType: toStr(pick(body, ["content_type", "mime", "contentType"])),
      body: parsedBody,
    };
  }

  async utxoInscriptions(outpoint: string): Promise<string[]> {
    const body = await this.get(this.paths.utxo, { outpoint });
    if (!body) return [];
    const items = pick(body, ["items", "inscriptions", "results"]);
    if (!Array.isArray(items)) throw new IndexerError("Zord utxo lookup: unexpected shape — refusing to assume empty");
    return items
      .map((i) => (typeof i === "string" ? i : toStr((i as Record<string, unknown>)?.id ?? (i as Record<string, unknown>)?.inscription_id)))
      .filter((x): x is string => !!x);
  }
}
