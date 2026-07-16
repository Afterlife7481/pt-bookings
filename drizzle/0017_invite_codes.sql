ALTER TABLE "trainer_magic_links" ADD COLUMN IF NOT EXISTS "invite_code" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invite_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"owner_trainer_id" text,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invite_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_code_id" text NOT NULL,
	"trainer_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_owner_trainer_id_trainers_id_fk" FOREIGN KEY ("owner_trainer_id") REFERENCES "public"."trainers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invite_redemptions" ADD CONSTRAINT "invite_redemptions_invite_code_id_invite_codes_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "public"."invite_codes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invite_redemptions" ADD CONSTRAINT "invite_redemptions_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_code_uidx" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invite_codes_owner_idx" ON "invite_codes" USING btree ("owner_trainer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invite_redemptions_trainer_uidx" ON "invite_redemptions" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invite_redemptions_code_idx" ON "invite_redemptions" USING btree ("invite_code_id");
