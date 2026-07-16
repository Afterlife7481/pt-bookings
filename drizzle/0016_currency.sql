ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "currency" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "currency" text;
