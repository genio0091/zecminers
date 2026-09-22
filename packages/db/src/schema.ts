import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { EconomyParams, OreId } from "@zecminers/economy";

/** Tables follow blueprint §8.1. Amounts are BIGINT, surfaced as `bigint` in TypeScript. */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const amount = (name: string) => bigint(name, { mode: "bigint" });

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "frozen";
export type PassStatus = "unclaimed" | "active" | "moved" | "deactivated";
export type SlotState = "idle" | "mining" | "broken";
export type AccountType =
  | "pool_mining"
  | "pool_daily"
  | "pool_marketing"
  | "pool_liquidity"
  | "user"
  | "sink_burned"
  | "payout_pending"
  | "treasury_backing";
export type RaffleStatus = "open" | "closed" | "drawn" | "cancelled";
export type BatchStatus = "draft" | "approved" | "sending" | "done" | "held";
export type PayoutItemStatus =
  | "pending"
  | "approved"
  | "signing"
  | "inscribed"
  | "sent"
  | "settled"
  | "failed"
  | "returned";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  discordId: text("discord_id").notNull().unique(),
  discordUsername: text("discord_username"),
  discordCreatedAt: ts("discord_created_at"),
  role: text("role").$type<UserRole>().notNull().default("user"),
  status: text("status").$type<UserStatus>().notNull().default("active"),
  frozenReason: text("frozen_reason"),
  walletAddress: text("wallet_address").unique(),
  walletLinkedAt: ts("wallet_linked_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const passes = pgTable(
  "passes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passNumber: integer("pass_number").notNull().unique(),
    userId: uuid("user_id").references(() => users.id),
    /** ZRC-721 inscription id, filled once the pass is minted to the origin address. */
    inscriptionId: text("inscription_id").unique(),
    originAddress: text("origin_address").notNull().unique(),
    claimCodeHash: text("claim_code_hash"),
    claimCodeUsedAt: ts("claim_code_used_at"),
    status: text("status").$type<PassStatus>().notNull().default("unclaimed"),
    statusReason: text("status_reason"),
    lastOwnerCheckAt: ts("last_owner_check_at"),
    lastSeenOwner: text("last_seen_owner"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("passes_user_idx").on(t.userId), index("passes_status_idx").on(t.status)],
);

export const slots = pgTable(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    passId: uuid("pass_id")
      .notNull()
      .unique()
      .references(() => passes.id),
    name: text("name").notNull().default("Zandy"),
    level: integer("level").notNull().default(1),
    durability: integer("durability").notNull(),
    state: text("state").$type<SlotState>().notNull().default("idle"),
    brokenUntil: ts("broken_until"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("slots_user_idx").on(t.userId),
    check("slots_level_range", sql`${t.level} between 1 and 5`),
    check("slots_durability_nonneg", sql`${t.durability} >= 0`),
  ],
);

export const miningSessions = pgTable(
  "mining_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id),
    day: date("day", { mode: "string" }).notNull(),
    startedAt: ts("started_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    collectedAt: ts("collected_at"),
    configVersion: integer("config_version").notNull(),
    level: integer("level").notNull(),
    reward: amount("reward"),
    oreDrops: jsonb("ore_drops").$type<Record<OreId, number>>(),
  },
  (t) => [unique("mining_sessions_slot_day").on(t.slotId, t.day), index("mining_sessions_day_idx").on(t.day)],
);

export const economyConfig = pgTable("economy_config", {
  version: serial("version").primaryKey(),
  params: jsonb("params").$type<EconomyParams>().notNull(),
  activeFrom: ts("active_from").notNull(),
  createdBy: text("created_by").notNull(),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const dailyClaims = pgTable(
  "daily_claims",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    day: date("day", { mode: "string" }).notNull(),
    streak: integer("streak").notNull(),
    amount: amount("amount").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const inventory = pgTable(
  "inventory",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    item: text("item").$type<OreId>().notNull(),
    qty: integer("qty").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.item] }), check("inventory_qty_nonneg", sql`${t.qty} >= 0`)],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    item: text("item").$type<OreId>().notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("inventory_movements_user_idx").on(t.userId)],
);

export const ledgerAccounts = pgTable(
  "ledger_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** `pool_mining`, `sink_burned`, … for system accounts; `user:<uuid>` for players. */
    code: text("code").notNull().unique(),
    type: text("type").$type<AccountType>().notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .unique(),
    balance: amount("balance").notNull().default(sql`0`),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Defense in depth: the ledger function also refuses negative balances.
    check("ledger_accounts_nonneg", sql`${t.balance} >= 0 or ${t.type} = 'treasury_backing'`),
  ],
);

export const ledgerTransactions = pgTable(
  "ledger_transactions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    kind: text("kind").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    actor: text("actor").notNull(),
    memo: text("memo"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("ledger_transactions_kind_idx").on(t.kind, t.createdAt)],
);

/** Immutable: a trigger in the migrations rejects UPDATE and DELETE. */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    txId: bigint("tx_id", { mode: "number" })
      .notNull()
      .references(() => ledgerTransactions.id),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => ledgerAccounts.id),
    amount: amount("amount").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ledger_entries_account_idx").on(t.accountId, t.id),
    index("ledger_entries_tx_idx").on(t.txId),
    check("ledger_entries_nonzero", sql`${t.amount} <> 0`),
  ],
);

export const raffles = pgTable("raffles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").$type<RaffleStatus>().notNull().default("open"),
  /** sha256(seed bytes), published when the raffle opens. */
  seedHash: text("seed_hash").notNull(),
  /** Secret until the draw. Never returned by any API before status = drawn. */
  seed: text("seed").notNull(),
  closeBlockHeight: integer("close_block_height").notNull(),
  blockHash: text("block_hash"),
  ticketPrice: amount("ticket_price").notNull(),
  prizeAmount: amount("prize_amount").notNull().default(sql`0`),
  winnerCount: integer("winner_count").notNull().default(1),
  totalTickets: integer("total_tickets").notNull().default(0),
  winners: jsonb("winners").$type<{ index: number; userId: string; prize: string }[]>(),
  createdAt: ts("created_at").notNull().defaultNow(),
  drawnAt: ts("drawn_at"),
});

export const raffleTickets = pgTable(
  "raffle_tickets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    startIndex: integer("start_index").notNull(),
    count: integer("count").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("raffle_tickets_raffle_idx").on(t.raffleId, t.startIndex)],
);

export const payoutBatches = pgTable("payout_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  week: text("week").notNull().unique(),
  status: text("status").$type<BatchStatus>().notNull().default("draft"),
  totalAmount: amount("total_amount").notNull().default(sql`0`),
  feeZats: bigint("fee_zats", { mode: "number" }).notNull().default(0),
  recipients: integer("recipients").notNull().default(0),
  heldReason: text("held_reason"),
  /** Admin id as written in the audit log. */
  approvedBy: text("approved_by"),
  approvedAt: ts("approved_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  completedAt: ts("completed_at"),
});

export const payoutItems = pgTable(
  "payout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => payoutBatches.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    passId: uuid("pass_id")
      .notNull()
      .references(() => passes.id),
    /** Always the pass origin address (blueprint §10.6). */
    address: text("address").notNull(),
    amount: amount("amount").notNull(),
    status: text("status").$type<PayoutItemStatus>().notNull().default("pending"),
    transferInscriptionId: text("transfer_inscription_id"),
    inscribeTxid: text("inscribe_txid"),
    sendTxid: text("send_txid"),
    sendHeight: integer("send_height"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("payout_items_batch_user").on(t.batchId, t.userId), index("payout_items_status_idx").on(t.status)],
);

export const chainRegistry = pgTable("chain_registry", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export interface InvariantResult {
  name: string;
  ok: boolean | null;
  detail: string;
}

export const porSnapshots = pgTable(
  "por_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    takenAt: ts("taken_at").notNull().defaultNow(),
    onchainTreasury: amount("onchain_treasury"),
    paidOutTotal: amount("paid_out_total").notNull(),
    ledgerTotals: jsonb("ledger_totals").$type<Record<string, string>>().notNull(),
    invariants: jsonb("invariants").$type<InvariantResult[]>().notNull(),
    invariantsOk: boolean("invariants_ok").notNull(),
  },
  (t) => [index("por_snapshots_taken_idx").on(t.takenAt)],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    reason: text("reason").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("admin_audit_log_created_idx").on(t.createdAt)],
);

export const systemFlags = pgTable("system_flags", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const alerts = pgTable(
  "alerts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    level: text("level").$type<"info" | "medium" | "high" | "critical">().notNull(),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("alerts_created_idx").on(t.createdAt)],
);

export const waitlist = pgTable("waitlist", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  handle: text("handle").notNull(),
  address: text("address").notNull().unique(),
  tasks: jsonb("tasks").$type<Record<string, boolean>>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});
