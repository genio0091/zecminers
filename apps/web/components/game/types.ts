import type { getMe, getInventory, payoutHistory, SlotView, listRaffles } from "@zecminers/db";

/** Response shapes, taken from the server services so client and API can't drift. */
export type Me = Awaited<ReturnType<typeof getMe>>;
export type Slot = SlotView;
export type InventoryItem = Awaited<ReturnType<typeof getInventory>>[number];
export type PayoutRow = Awaited<ReturnType<typeof payoutHistory>>[number];
export type Raffle = Awaited<ReturnType<typeof listRaffles>>[number];

export interface RafflesResponse {
  raffles: Raffle[];
  mine: { raffleId: number; startIndex: number; count: number }[];
  tipHeight: number | null;
}

export interface LedgerRow {
  entryId: number;
  txId: number;
  kind: string;
  amount: string;
  memo: string | null;
  createdAt: string;
}

export type Tab = "mine" | "pass" | "payouts" | "raffle" | "ledger" | "proof";

export interface Notice {
  kind: "good" | "bad" | "info";
  text: string;
}
