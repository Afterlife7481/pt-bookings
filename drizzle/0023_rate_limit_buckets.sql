CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" text NOT NULL
);
