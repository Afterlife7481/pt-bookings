CREATE TABLE IF NOT EXISTS "message_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "trainer_id" text NOT NULL,
  "template_key" text NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "updated_at" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_templates_trainer_key_uidx" ON "message_templates" USING btree ("trainer_id","template_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_trainer_idx" ON "message_templates" USING btree ("trainer_id");
