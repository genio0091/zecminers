ALTER TABLE "waitlist_entries" ADD COLUMN "discord_id" text;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "discord_username" text;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "discord_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "discord_member_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_discord_id_unique" UNIQUE("discord_id");