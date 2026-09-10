ALTER TABLE "sales" ADD COLUMN "payment_methods" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
-- Backfill: convierte el método único anterior en un arreglo.
UPDATE "sales" SET "payment_methods" = ARRAY["payment_method"::text] WHERE "payment_method" IS NOT NULL;