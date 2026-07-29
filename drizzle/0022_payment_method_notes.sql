ALTER TABLE "trainer_payment_methods" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
INSERT INTO "trainer_payment_methods" ("id", "trainer_id", "name", "sort_order", "created_at", "note")
SELECT
  'pm_' || t."id" || '_cash',
  t."id",
  'Cash',
  0,
  COALESCE(t."created_at", to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  NULL
FROM "trainers" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "trainer_payment_methods" m
  WHERE m."trainer_id" = t."id" AND lower(m."name") = 'cash'
);
--> statement-breakpoint
INSERT INTO "trainer_payment_methods" ("id", "trainer_id", "name", "sort_order", "created_at", "note")
SELECT
  'pm_' || t."id" || '_transfer',
  t."id",
  'Transfer',
  1,
  COALESCE(t."created_at", to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  NULL
FROM "trainers" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "trainer_payment_methods" m
  WHERE m."trainer_id" = t."id" AND lower(m."name") = 'transfer'
);
--> statement-breakpoint
UPDATE "trainer_payment_methods" AS m
SET "note" = NULLIF(
  trim(both E'\n' FROM concat_ws(
    E'\n',
    CASE
      WHEN t."payment_payee_name" IS NOT NULL AND trim(t."payment_payee_name") <> ''
        THEN 'Pay to: ' || trim(t."payment_payee_name")
      ELSE NULL
    END,
    CASE
      WHEN t."bank_name" IS NOT NULL AND trim(t."bank_name") <> ''
        THEN 'Bank: ' || trim(t."bank_name")
      ELSE NULL
    END,
    CASE
      WHEN t."bank_sort_code" IS NOT NULL AND trim(t."bank_sort_code") <> ''
        THEN 'Sort code: ' || trim(t."bank_sort_code")
      ELSE NULL
    END,
    CASE
      WHEN t."bank_account_number" IS NOT NULL AND trim(t."bank_account_number") <> ''
        THEN 'Account: ' || trim(t."bank_account_number")
      ELSE NULL
    END
  )),
  ''
)
FROM "trainers" AS t
WHERE m."trainer_id" = t."id"
  AND m."name" = 'Transfer'
  AND (m."note" IS NULL OR trim(m."note") = '')
  AND (
    (t."bank_sort_code" IS NOT NULL AND trim(t."bank_sort_code") <> '')
    OR (t."bank_account_number" IS NOT NULL AND trim(t."bank_account_number") <> '')
    OR (t."bank_name" IS NOT NULL AND trim(t."bank_name") <> '')
    OR (t."payment_payee_name" IS NOT NULL AND trim(t."payment_payee_name") <> '')
  );
