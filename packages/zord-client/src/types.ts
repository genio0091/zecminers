/**
 * What the rest of the system needs from the indexer. Zord is the single source of truth for
 * $ZGEMS balances and pass ownership (blueprint §3.2). The browser never calls it directly.
 */
export interface IndexerStatus {
  /** Highest block height the indexer has processed. */
  height: number;
  /** When that block was produced, if the indexer reports it. */
  blockTime: string | null;
}

export interface TokenInfo {
  tick: string;
  max: bigint;
  minted: bigint;
  holders: number;
  deployInscriptionId: string | null;
  deployTxid: string | null;
}

export interface InscriptionInfo {
  id: string;
  /** Current owner address according to the indexer. */
  owner: string;
  /** txid:vout of the UTXO carrying the inscription. */
  outpoint: string | null;
  height: number | null;
  contentType: string | null;
  /** Parsed JSON body for zrc-20 / zrc-721 inscriptions. */
  body: Record<string, unknown> | null;
}

export interface ChainIndexer {
  status(): Promise<IndexerStatus>;
  token(tick: string): Promise<TokenInfo | null>;
  balance(address: string, tick: string): Promise<bigint>;
  inscription(id: string): Promise<InscriptionInfo | null>;
  /**
   * Inscriptions carried by a UTXO. Used before spending any coin: a non-empty answer means
   * the coin carries a token or pass and must not be used as a fee input (blueprint §10.4).
   */
  utxoInscriptions(outpoint: string): Promise<string[]>;
}

export class IndexerError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "IndexerError";
  }
}
