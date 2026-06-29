CREATE TABLE "applied_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"week_start" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"slot_id" text,
	"session_start_at" text NOT NULL,
	"client_id" text NOT NULL,
	"token" text NOT NULL,
	"status" text NOT NULL,
	"override_36h" boolean DEFAULT false NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"session_paid" boolean DEFAULT false NOT NULL,
	"payment_type" text,
	"invoice_sent_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "bookings_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"from_slot_id" text NOT NULL,
	"to_slot_id" text,
	"status" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_last_minute_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"location_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text NOT NULL,
	"last_minute_opt_in" boolean DEFAULT false NOT NULL,
	"session_price" integer,
	"created_at" text NOT NULL,
	CONSTRAINT "clients_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "last_minute_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"slot_id" text NOT NULL,
	"client_id" text NOT NULL,
	"status" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "last_minute_interests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"location_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"applied_week_id" text NOT NULL,
	"start_at" text NOT NULL,
	"end_at" text NOT NULL,
	"status" text NOT NULL,
	"location_id" text,
	"held_for_client_id" text,
	"hold_expires_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"location_id" text
);
--> statement-breakpoint
CREATE TABLE "trainer_magic_links" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"purpose" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "trainer_magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "trainer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "trainer_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"schedule_start_time" text DEFAULT '07:00' NOT NULL,
	"schedule_end_time" text DEFAULT '21:00' NOT NULL,
	"schedule_default_view" text DEFAULT 'day' NOT NULL,
	"cancel_deadline_hours" integer DEFAULT 36 NOT NULL,
	"last_minute_offer_lock_hours" integer DEFAULT 1 NOT NULL,
	"client_booking_window_weeks" integer DEFAULT 2 NOT NULL,
	"bank_account_number" text,
	"bank_sort_code" text,
	"bank_name" text,
	"payment_payee_name" text,
	"created_at" text NOT NULL,
	CONSTRAINT "trainers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text,
	"phone" text NOT NULL,
	"message_type" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applied_weeks" ADD CONSTRAINT "applied_weeks_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_from_slot_id_slots_id_fk" FOREIGN KEY ("from_slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_to_slot_id_slots_id_fk" FOREIGN KEY ("to_slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_last_minute_preferences" ADD CONSTRAINT "client_last_minute_preferences_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_last_minute_preferences" ADD CONSTRAINT "client_last_minute_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "last_minute_interests" ADD CONSTRAINT "last_minute_interests_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "last_minute_interests" ADD CONSTRAINT "last_minute_interests_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "last_minute_interests" ADD CONSTRAINT "last_minute_interests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_preferences" ADD CONSTRAINT "recurring_preferences_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_preferences" ADD CONSTRAINT "recurring_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_preferences" ADD CONSTRAINT "recurring_preferences_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_applied_week_id_applied_weeks_id_fk" FOREIGN KEY ("applied_week_id") REFERENCES "public"."applied_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_held_for_client_id_clients_id_fk" FOREIGN KEY ("held_for_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_slots" ADD CONSTRAINT "template_slots_template_id_weekly_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."weekly_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_slots" ADD CONSTRAINT "template_slots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_sessions" ADD CONSTRAINT "trainer_sessions_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_templates" ADD CONSTRAINT "weekly_templates_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applied_weeks_trainer_week_idx" ON "applied_weeks" USING btree ("trainer_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_slot_idx" ON "bookings" USING btree ("slot_id") WHERE "bookings"."slot_id" is not null and "bookings"."status" <> 'canceled';--> statement-breakpoint
CREATE UNIQUE INDEX "client_last_minute_prefs_slot_idx" ON "client_last_minute_preferences" USING btree ("client_id","day_of_week","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "client_locations_client_location_idx" ON "client_locations" USING btree ("client_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_preferences_slot_idx" ON "recurring_preferences" USING btree ("trainer_id","day_of_week","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "slots_trainer_start_idx" ON "slots" USING btree ("trainer_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_templates_trainer_idx" ON "weekly_templates" USING btree ("trainer_id");