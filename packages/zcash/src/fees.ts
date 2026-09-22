/**
 * ZIP 317 proportional fee for a transparent-only transaction (blueprint §3.5):
 *   fee = 5000 · max(2, max(⌈tx_in_size / 150⌉, ⌈tx_out_size / 34⌉))
 * Inscription payloads inflate the byte size, so never hard-code the fee.
 */
export const MARGINAL_FEE_ZATS = 5_000;
export const GRACE_ACTIONS = 2;
export const P2PKH_STANDARD_INPUT_SIZE = 150;
export const P2PKH_STANDARD_OUTPUT_SIZE = 34;
export const ZATS_PER_ZEC = 100_000_000;

export interface TransparentSizes {
  /** Total serialized size of all transparent inputs, in bytes. */
  txInTotalSize: number;
  /** Total serialized size of all transparent outputs, in bytes. */
  txOutTotalSize: number;
}

export function logicalActions({ txInTotalSize, txOutTotalSize }: TransparentSizes): number {
  return Math.max(
    Math.ceil(Math.max(0, txInTotalSize) / P2PKH_STANDARD_INPUT_SIZE),
    Math.ceil(Math.max(0, txOutTotalSize) / P2PKH_STANDARD_OUTPUT_SIZE),
  );
}

export function zip317Fee(sizes: TransparentSizes): number {
  return MARGINAL_FEE_ZATS * Math.max(GRACE_ACTIONS, logicalActions(sizes));
}

export function zatsToZec(zats: number | bigint): string {
  const z = BigInt(zats);
  const whole = z / 100_000_000n;
  const frac = (z % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Rough per-payout estimate used for batch previews: two transactions, 2–5 actions each. */
export function estimatePayoutFeeZats(payloadBytes: number): number {
  const tx1 = zip317Fee({ txInTotalSize: 150, txOutTotalSize: 34 + payloadBytes + 11 });
  const tx2 = zip317Fee({ txInTotalSize: 150 * 2, txOutTotalSize: 34 * 2 });
  return tx1 + tx2;
}
