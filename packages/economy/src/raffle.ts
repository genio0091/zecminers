import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Provably fair raffle (blueprint §7.6):
 *   winner = HMAC_SHA256(seed, blockhash_H ‖ raffle_id) mod total_tickets
 *
 * Encoding, published so anyone can recompute it:
 *   key     = the seed as raw bytes (hex-decoded, 32 bytes)
 *   message = UTF-8 of `${blockHashHex}${raffleId}` (block hash lowercase hex, raffle id in decimal)
 *   digest  = read as an unsigned big-endian 256-bit integer
 * For extra winners (k ≥ 1) the message gets `:${k}` appended. k = 0 is exactly the public formula.
 */
export function seedCommitment(seedHex: string): string {
  return bytesToHex(sha256(hexToBytes(seedHex)));
}

export function raffleDigest(seedHex: string, blockHashHex: string, raffleId: number | string, k = 0): bigint {
  const message = `${blockHashHex.toLowerCase()}${raffleId}${k > 0 ? `:${k}` : ""}`;
  const mac = hmac(sha256, hexToBytes(seedHex), utf8ToBytes(message));
  return BigInt(`0x${bytesToHex(mac)}`);
}

export function raffleWinnerIndex(
  seedHex: string,
  blockHashHex: string,
  raffleId: number | string,
  totalTickets: number,
  k = 0,
): number {
  if (!Number.isInteger(totalTickets) || totalTickets <= 0) {
    throw new Error("totalTickets must be a positive integer");
  }
  return Number(raffleDigest(seedHex, blockHashHex, raffleId, k) % BigInt(totalTickets));
}

export interface TicketRange {
  userId: string;
  startIndex: number;
  count: number;
}

/** Ticket ranges are contiguous [start, start+count). Returns the owner of `index`. */
export function ticketOwner(ranges: TicketRange[], index: number): TicketRange | null {
  for (const range of ranges) {
    if (index >= range.startIndex && index < range.startIndex + range.count) return range;
  }
  return null;
}

/**
 * Draw `winnerCount` distinct ticket indexes. If a derived index repeats, k keeps increasing
 * until a new one appears — deterministic, so a verifier gets the same list.
 */
export function drawWinners(
  seedHex: string,
  blockHashHex: string,
  raffleId: number | string,
  totalTickets: number,
  winnerCount = 1,
): number[] {
  const wanted = Math.min(winnerCount, totalTickets);
  const picked: number[] = [];
  for (let k = 0; picked.length < wanted; k++) {
    const idx = raffleWinnerIndex(seedHex, blockHashHex, raffleId, totalTickets, k);
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked;
}
