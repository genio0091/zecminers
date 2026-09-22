CREATE TABLE "admin_audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_registry" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_claims" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"streak" integer NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_claims_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "economy_config" (
	"version" serial PRIMARY KEY NOT NULL,
	"params" jsonb NOT NULL,
	"active_from" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"user_id" uuid NOT NULL,
	"item" text NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_user_id_item_pk" PRIMARY KEY("user_id","item"),
	CONSTRAINT "inventory_qty_nonneg" CHECK ("inventory"."qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"item" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"user_id" uuid,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_accounts_code_unique" UNIQUE("code"),
	CONSTRAINT "ledger_accounts_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ledger_accounts_nonneg" CHECK ("ledger_accounts"."balance" >= 0 or "ledger_accounts"."type" = 'treasury_backing')
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tx_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_nonzero" CHECK ("ledger_entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"kind" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"actor" text NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "mining_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"day" date NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone,
	"config_version" integer NOT NULL,
	"level" integer NOT NULL,
	"reward" bigint,
	"ore_drops" jsonb,
	CONSTRAINT "mining_sessions_slot_day" UNIQUE("slot_id","day")
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pass_number" integer NOT NULL,
	"user_id" uuid,
	"inscription_id" text,
	"origin_address" text NOT NULL,
	"claim_code_hash" text,
	"claim_code_used_at" timestamp with time zone,
	"status" text DEFAULT 'unclaimed' NOT NULL,
	"status_reason" text,
	"last_owner_check_at" timestamp with time zone,
	"last_seen_owner" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passes_pass_number_unique" UNIQUE("pass_number"),
	CONSTRAINT "passes_inscription_id_unique" UNIQUE("inscription_id"),
	CONSTRAINT "passes_origin_address_unique" UNIQUE("origin_address")
);
--> statement-breakpoint
CREATE TABLE "payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"fee_zats" bigint DEFAULT 0 NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"held_reason" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "payout_batches_week_unique" UNIQUE("week")
);
--> statement-breakpoint
CREATE TABLE "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pass_id" uuid NOT NULL,
	"address" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transfer_inscription_id" text,
	"inscribe_txid" text,
	"send_txid" text,
	"send_height" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_items_batch_user" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "por_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"onchain_treasury" bigint,
	"paid_out_total" bigint NOT NULL,
	"ledger_totals" jsonb NOT NULL,
	"invariants" jsonb NOT NULL,
	"invariants_ok" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffle_tickets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raffle_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"start_index" integer NOT NULL,
	"count" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raffle_tickets_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "raffles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"seed_hash" text NOT NULL,
	"seed" text NOT NULL,
	"close_block_height" integer NOT NULL,
	"block_hash" text,
	"ticket_price" bigint NOT NULL,
	"prize_amount" bigint DEFAULT 0 NOT NULL,
	"winner_count" integer DEFAULT 1 NOT NULL,
	"total_tickets" integer DEFAULT 0 NOT NULL,
	"winners" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"drawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pass_id" uuid NOT NULL,
	"name" text DEFAULT 'Zandy' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"durability" integer NOT NULL,
	"state" text DEFAULT 'idle' NOT NULL,
	"broken_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slots_pass_id_unique" UNIQUE("pass_id"),
	CONSTRAINT "slots_level_range" CHECK ("slots"."level" between 1 and 5),
	CONSTRAINT "slots_durability_nonneg" CHECK ("slots"."durability" >= 0)
);
--> statement-breakpoint
CREATE TABLE "system_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"discord_username" text,
	"discord_created_at" timestamp with time zone,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"frozen_reason" text,
	"wallet_address" text,
	"wallet_linked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"address" text NOT NULL,
	"tasks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "daily_claims" ADD CONSTRAINT "daily_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tx_id_ledger_transactions_id_fk" FOREIGN KEY ("tx_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mining_sessions" ADD CONSTRAINT "mining_sessions_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payout_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_user_idx" ON "inventory_movements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_account_idx" ON "ledger_entries" USING btree ("account_id","id");--> statement-breakpoint
CREATE INDEX "ledger_entries_tx_idx" ON "ledger_entries" USING btree ("tx_id");--> statement-breakpoint
CREATE INDEX "ledger_transactions_kind_idx" ON "ledger_transactions" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "mining_sessions_day_idx" ON "mining_sessions" USING btree ("day");--> statement-breakpoint
CREATE INDEX "passes_user_idx" ON "passes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passes_status_idx" ON "passes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_items_status_idx" ON "payout_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "por_snapshots_taken_idx" ON "por_snapshots" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "raffle_tickets_raffle_idx" ON "raffle_tickets" USING btree ("raffle_id","start_index");--> statement-breakpoint
CREATE INDEX "slots_user_idx" ON "slots" USING btree ("user_id");