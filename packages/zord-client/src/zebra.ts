/**
 * Minimal Zebra (zebrad) JSON-RPC client. RPC only listens on a private network (blueprint §11.2).
 * Zebra has no wallet: it is used to read the chain and broadcast signed transactions.
 */
export interface ZebraRpcOptions {
  url: string;
  user?: string;
  password?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class ZebraRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "ZebraRpcError";
  }
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  bestblockhash: string;
  upgrades?: Record<string, { name: string; activationheight: number; status: string }>;
}

export class ZebraRpc {
  private id = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: ZebraRpcOptions) {
    this.fetchImpl = opts.fetch ?? fetch;
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.opts.user) {
      headers.authorization = `Basic ${Buffer.from(`${this.opts.user}:${this.opts.password ?? ""}`).toString("base64")}`;
    }
    const res = await this.fetchImpl(this.opts.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params }),
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 10_000),
    });
    const json = (await res.json().catch(() => null)) as { result?: T; error?: { code: number; message: string } } | null;
    if (!json) throw new ZebraRpcError(`Zebra RPC ${method}: HTTP ${res.status}`);
    if (json.error) throw new ZebraRpcError(`Zebra RPC ${method}: ${json.error.message}`, json.error.code);
    return json.result as T;
  }

  getBlockCount(): Promise<number> {
    return this.call<number>("getblockcount");
  }

  getBlockHash(height: number): Promise<string> {
    return this.call<string>("getblockhash", [height]);
  }

  getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.call<BlockchainInfo>("getblockchaininfo");
  }

  getRawTransaction(txid: string): Promise<{ txid: string; height?: number; confirmations?: number; hex: string }> {
    return this.call("getrawtransaction", [txid, 1]);
  }

  sendRawTransaction(hex: string): Promise<string> {
    return this.call<string>("sendrawtransaction", [hex]);
  }
}
