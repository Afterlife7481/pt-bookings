ALTER TABLE "trainers" ALTER COLUMN "schedule_default_view" SET DEFAULT 'day';--> statement-breakpoint
UPDATE "trainers" SET "schedule_default_view" = 'day' WHERE "schedule_default_view" = 'week';
