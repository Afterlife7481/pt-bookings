ALTER TABLE "trainers" ALTER COLUMN "schedule_default_view" SET DEFAULT 'week';--> statement-breakpoint
UPDATE "trainers" SET "schedule_default_view" = 'week' WHERE "schedule_default_view" = 'day';
