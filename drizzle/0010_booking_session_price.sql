ALTER TABLE "bookings" ADD COLUMN "session_price" integer;

UPDATE "bookings" AS b
SET "session_price" = c."session_price"
FROM "clients" AS c
WHERE b."client_id" = c."id";
