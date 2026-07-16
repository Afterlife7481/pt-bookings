CREATE TABLE "schedule_conflict_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"week_start" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"location_id" text,
	"location_name" text,
	"holiday_id" text,
	"holiday_label" text,
	"slot_label" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"acknowledgment_token" text NOT NULL,
	"notified_at" text,
	"acknowledged_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "schedule_conflict_alerts_acknowledgment_token_unique" UNIQUE("acknowledgment_token")
);
--> statement-breakpoint
ALTER TABLE "schedule_conflict_alerts" ADD CONSTRAINT "schedule_conflict_alerts_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_conflict_alerts" ADD CONSTRAINT "schedule_conflict_alerts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_conflict_alerts" ADD CONSTRAINT "schedule_conflict_alerts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_conflict_alerts" ADD CONSTRAINT "schedule_conflict_alerts_holiday_id_trainer_holidays_id_fk" FOREIGN KEY ("holiday_id") REFERENCES "public"."trainer_holidays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_conflict_alerts_trainer_idx" ON "schedule_conflict_alerts" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "schedule_conflict_alerts_token_idx" ON "schedule_conflict_alerts" USING btree ("acknowledgment_token");
