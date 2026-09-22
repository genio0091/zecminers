import { sha256 } from "@noble/hashes/sha2.js";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX: Record<string, number> = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]));

export function base58Decode(input: string): Uint8Array {
  let value = 0n;
  for (const ch of input) {
    const digit = INDEX[ch];
    if (digit === undefined) throw new Error("invalid base58 character");
    value = value * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  for (const ch of input) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function base58Encode(bytes: Uint8Array): string {
  let value = 0n;
  for (const b of bytes) value = (value << 8n) | BigInt(b);
  let out = "";
  while (value > 0n) {
    out = ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

function checksum(payload: Uint8Array): Uint8Array {
  return sha256(sha256(payload)).slice(0, 4);
}

export function base58CheckDecode(input: string): Uint8Array | null {
  let raw: Uint8Array;
  try {
    raw = base58Decode(input);
  } catch {
    return null;
  }
  if (raw.length < 5) return null;
  const payload = raw.slice(0, -4);
  const sum = checksum(payload);
  const given = raw.slice(-4);
  for (let i = 0; i < 4; i++) if (sum[i] !== given[i]) return null;
  return payload;
}

export function base58CheckEncode(payload: Uint8Array): string {
  const out = new Uint8Array(payload.length + 4);
  out.set(payload);
  out.set(checksum(payload), payload.length);
  return base58Encode(out);
}

export type ZcashNetwork = "mainnet" | "testnet";
export type TransparentKind = "p2pkh" | "p2sh";

/** Two-byte version prefixes for transparent addresses (Zcash protocol spec §5.6.1.1). */
const PREFIXES: Record<ZcashNetwork, Record<TransparentKind, [number, number]>> = {
  mainnet: { p2pkh: [0x1c, 0xb8], p2sh: [0x1c, 0xbd] }, // t1…, t3…
  testnet: { p2pkh: [0x1d, 0x25], p2sh: [0x1c, 0xba] }, // tm…, t2…
};

export type AddressCheck =
  | { ok: true; network: ZcashNetwork; kind: TransparentKind; hash160: Uint8Array }
  | { ok: false; reason: "format" | "checksum" | "network" | "kind" };

export interface AddressOptions {
  network?: ZcashNetwork;
  /** ZRC-20 wallets such as Zatoshi Wallet use t1 (P2PKH). P2SH is rejected by default. */
  allowP2SH?: boolean;
}

/** Validates a transparent Zcash address with base58check (blueprint §7.1). */
export function checkTransparentAddress(address: string, opts: AddressOptions = {}): AddressCheck {
  const network = opts.network ?? "mainnet";
  const trimmed = address.trim();
  if (!/^t[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(trimmed)) return { ok: false, reason: "format" };
  const payload = base58CheckDecode(trimmed);
  if (!payload) return { ok: false, reason: "checksum" };
  if (payload.length !== 22) return { ok: false, reason: "format" };

  for (const net of ["mainnet", "testnet"] as const) {
    for (const kind of ["p2pkh", "p2sh"] as const) {
      const [a, b] = PREFIXES[net][kind];
      if (payload[0] === a && payload[1] === b) {
        if (net !== network) return { ok: false, reason: "network" };
        if (kind === "p2sh" && !opts.allowP2SH) return { ok: false, reason: "kind" };
        return { ok: true, network: net, kind, hash160: payload.slice(2) };
      }
    }
  }
  return { ok: false, reason: "format" };
}

export function isValidTransparentAddress(address: string, opts: AddressOptions = {}): boolean {
  return checkTransparentAddress(address, opts).ok;
}

export function encodeTransparentAddress(
  hash160: Uint8Array,
  network: ZcashNetwork = "mainnet",
  kind: TransparentKind = "p2pkh",
): string {
  if (hash160.length !== 20) throw new Error("hash160 must be 20 bytes");
  const [a, b] = PREFIXES[network][kind];
  const payload = new Uint8Array(22);
  payload[0] = a;
  payload[1] = b;
  payload.set(hash160, 2);
  return base58CheckEncode(payload);
}

export const ADDRESS_ERROR_MESSAGES: Record<Exclude<AddressCheck, { ok: true }>["reason"], string> = {
  format: "That does not look like a transparent t1 address.",
  checksum: "Address checksum failed. Copy it again from your wallet.",
  network: "That address is for a different Zcash network.",
  kind: "Use the t1… address from a ZRC-20 wallet such as Zatoshi Wallet.",
};
