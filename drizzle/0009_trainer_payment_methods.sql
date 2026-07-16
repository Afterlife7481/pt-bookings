CREATE TABLE "trainer_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trainer_payment_methods" ADD CONSTRAINT "trainer_payment_methods_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trainer_payment_methods_trainer_name_idx" ON "trainer_payment_methods" USING btree ("trainer_id","name");--> statement-breakpoint
CREATE INDEX "trainer_payment_methods_trainer_sort_idx" ON "trainer_payment_methods" USING btree ("trainer_id","sort_order");--> statement-breakpoint
INSERT INTO "trainer_payment_methods" ("id", "trainer_id", "name", "sort_order", "created_at")
SELECT
  'pm_' || t."id" || '_' || d.ord,
  t."id",
  d.name,
  d.ord,
  t."created_at"
FROM "trainers" t
CROSS JOIN (
  VALUES
    (0, 'Cash'),
    (1, 'Transfer'),
    (2, 'Monzo')
) AS d(ord, name);--> statement-breakpoint
UPDATE "bookings"
SET "payment_type" = CASE "payment_type"
  WHEN 'cash' THEN 'Cash'
  WHEN 'bank_transfer' THEN 'Transfer'
  WHEN 'card' THEN 'Card'
  WHEN 'other' THEN 'Other'
  ELSE "payment_type"
END
WHERE "payment_type" IN ('cash', 'bank_transfer', 'card', 'other');
