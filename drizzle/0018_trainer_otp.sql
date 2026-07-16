ALTER TABLE "trainer_magic_links" ADD COLUMN IF NOT EXISTS "code_hash" text;--> statement-breakpoint
ALTER TABLE "trainer_magic_links" ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL;
