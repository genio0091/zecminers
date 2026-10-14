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
import type { EconomyParams } from "@hoodvalley/economy";

/** Hood Valley tables. Amounts are BIGINT $VALLEY, surfaced as `bigint` in TypeScript. */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const amount = (name: string) => bigint(name, { mode: "bigint" });

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "frozen";
export type PassStatus = "unclaimed" | "active" | "moved" | "deactivated";
export type SlotState = "idle" | "mining" | "broken";
export type AccountType =
  | "pool_mining"
  | "pool_liquidity"
  | "pool_community"
  | "pool_presale_lp"
  | "pool_team"
  /** Pre-Hood Valley pools: emptied into the new split at genesis or by `reallocateLegacyPools`. */
  | "pool_daily"
  | "pool_marketing"
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
    /** Team/test login: can sign in and play, is never included in a payout batch. */
    isTest: boolean("is_test").notNull().default(false),
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
    /** Unused since the shift model (kept for history): trait power now comes from the Miner. */
    level: integer("level").notNull().default(1),
    durability: integer("durability").notNull().default(0),
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
    /** Shift day the Miner was deployed into. */
    day: date("day", { mode: "string" }).notNull(),
    /** Deployed at. */
    startedAt: ts("started_at").notNull(),
    /** The window close: extraction stops here. */
    endsAt: ts("ends_at").notNull(),
    /** Claimed at. */
    collectedAt: ts("collected_at"),
    configVersion: integer("config_version").notNull(),
    level: integer("level").notNull().default(1),
    /** Trait power at deploy, 10_000 = 1.00×. */
    powerBp: integer("power_bp").notNull().default(10_000),
    /** Claim weight: power × share of the window worked. */
    weightBp: integer("weight_bp").notNull().default(0),
    /** The claimed share. */
    reward: amount("reward"),
    oreDrops: jsonb("ore_drops").$type<Record<string, number>>(),
    /** Geared up after claiming; the Miner can take the next shift. */
    gearedAt: ts("geared_at"),
  },
  (t) => [unique("mining_sessions_slot_day").on(t.slotId, t.day), index("mining_sessions_day_idx").on(t.day)],
);

/** One row per shift that had Miners on it: the pool is fixed when the first Miner deploys. */
export const shiftDays = pgTable("shift_days", {
  day: date("day", { mode: "string" }).primaryKey(),
  pool: amount("pool").notNull(),
  configVersion: integer("config_version").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const economyConfig = pgTable("economy_config", {
  version: serial("version").primaryKey(),
  params: jsonb("params").$type<EconomyParams>().notNull(),
  activeFrom: ts("active_from").notNull(),
  createdBy: text("created_by").notNull(),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Streak log: one row per shift day the player geared up, with the streak bonus paid. */
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
    item: text("item").notNull(),
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
    item: text("item").notNull(),
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

/**
 * The waitlist gate in front of the public site: connect X, the social tasks, a Robinhood Chain
 * wallet and consent. `unlocked_at` is set once everything is done and opens the full site.
 */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Set by X OAuth — the only verified identity on the gate. */
    xId: text("x_id").unique(),
    xUsername: text("x_username"),
    xVerifiedAt: ts("x_verified_at"),
    /** Self-reported handle, used while X OAuth is not configured. */
    handle: text("handle"),
    /** Task key → ISO time it was marked (self-attested click-throughs). */
    tasks: jsonb("tasks").$type<Record<string, string>>().notNull().default({}),
    /** Robinhood Chain wallet, lower-case. One entry per wallet. */
    wallet: text("wallet").unique(),
    consentAt: ts("consent_at"),
    unlockedAt: ts("unlocked_at"),
    /** Place in line, assigned at unlock. */
    memberNo: integer("member_no").unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("waitlist_entries_unlocked_idx").on(t.unlockedAt)],
);

/** First-version allowlist (handle + address + tasks), kept for its rows. */
export const waitlist = pgTable("waitlist", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  handle: text("handle").notNull(),
  address: text("address").notNull().unique(),
  tasks: jsonb("tasks").$type<Record<string, boolean>>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});
