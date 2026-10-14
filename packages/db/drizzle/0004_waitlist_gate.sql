CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"x_id" text,
	"x_username" text,
	"x_verified_at" timestamp with time zone,
	"handle" text,
	"tasks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wallet" text,
	"consent_at" timestamp with time zone,
	"unlocked_at" timestamp with time zone,
	"member_no" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_x_id_unique" UNIQUE("x_id"),
	CONSTRAINT "waitlist_entries_wallet_unique" UNIQUE("wallet"),
	CONSTRAINT "waitlist_entries_member_no_unique" UNIQUE("member_no")
);
--> statement-breakpoint
CREATE INDEX "waitlist_entries_unlocked_idx" ON "waitlist_entries" USING btree ("unlocked_at");