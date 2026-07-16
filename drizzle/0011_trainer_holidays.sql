CREATE TABLE "trainer_holidays" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"start_at" text NOT NULL,
	"end_at" text NOT NULL,
	"label" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trainer_holidays" ADD CONSTRAINT "trainer_holidays_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trainer_holidays_trainer_start_idx" ON "trainer_holidays" USING btree ("trainer_id","start_at");
