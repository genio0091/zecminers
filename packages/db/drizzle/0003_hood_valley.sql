CREATE TABLE "shift_days" (
	"day" date PRIMARY KEY NOT NULL,
	"pool" bigint NOT NULL,
	"config_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mining_sessions" ALTER COLUMN "level" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "slots" ALTER COLUMN "durability" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mining_sessions" ADD COLUMN "power_bp" integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE "mining_sessions" ADD COLUMN "weight_bp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mining_sessions" ADD COLUMN "geared_at" timestamp with time zone;--> statement-breakpoint
-- Sessions from before the shift model: collected ones count as geared up, open ones share
-- their day's pool as one full-shift 1.00× Miner.
UPDATE "mining_sessions" SET "geared_at" = "collected_at" WHERE "collected_at" IS NOT NULL;--> statement-breakpoint
UPDATE "mining_sessions" SET "weight_bp" = "power_bp" WHERE "collected_at" IS NULL;--> statement-breakpoint
-- The Hood Valley pools (70/15/8/5/2). Genesis funds them; `reallocateLegacyPools` moves an
-- already-posted 80/10/5/5 genesis into this split.
INSERT INTO "ledger_accounts" ("code", "type") VALUES
  ('pool_community', 'pool_community'),
  ('pool_presale_lp', 'pool_presale_lp'),
  ('pool_team', 'pool_team')
ON CONFLICT ("code") DO NOTHING;
