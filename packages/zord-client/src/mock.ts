import type { ChainIndexer, IndexerStatus, InscriptionInfo, TokenInfo } from "./types";

/**
 * In-memory indexer for local development and tests (ZORD_MODE=mock).
 * It never talks to a chain; state is whatever the caller seeds.
 */
export interface MockIndexerState {
  height: number;
  tokens: Map<string, TokenInfo>;
  balances: Map<string, bigint>; // key `${tick}:${address}`
  inscriptions: Map<string, InscriptionInfo>;
  utxos: Map<string, string[]>;
}

export class MockIndexer implements ChainIndexer {
  readonly state: MockIndexerState;
  private readonly startedAt = Date.now();

  constructor(seed: Partial<MockIndexerState> = {}) {
    this.state = {
      height: seed.height ?? 3_480_000,
      tokens: seed.tokens ?? new Map(),
      balances: seed.balances ?? new Map(),
      inscriptions: seed.inscriptions ?? new Map(),
      utxos: seed.utxos ?? new Map(),
    };
  }

  /** Height advances one block per 75 s of wall time so finality checks behave. */
  private currentHeight(): number {
    return this.state.height + Math.floor((Date.now() - this.startedAt) / 75_000);
  }

  async status(): Promise<IndexerStatus> {
    return { height: this.currentHeight(), blockTime: new Date().toISOString() };
  }

  async token(tick: string): Promise<TokenInfo | null> {
    return this.state.tokens.get(tick) ?? null;
  }

  async balance(address: string, tick: string): Promise<bigint> {
    return this.state.balances.get(`${tick}:${address}`) ?? 0n;
  }

  setBalance(address: string, tick: string, amount: bigint) {
    this.state.balances.set(`${tick}:${address}`, amount);
  }

  async inscription(id: string): Promise<InscriptionInfo | null> {
    return this.state.inscriptions.get(id) ?? null;
  }

  setInscriptionOwner(id: string, owner: string) {
    const prev = this.state.inscriptions.get(id);
    this.state.inscriptions.set(id, {
      id,
      owner,
      outpoint: prev?.outpoint ?? null,
      height: prev?.height ?? this.state.height,
      contentType: prev?.contentType ?? "application/json",
      body: prev?.body ?? null,
    });
  }

  async utxoInscriptions(outpoint: string): Promise<string[]> {
    return this.state.utxos.get(outpoint) ?? [];
  }
}
