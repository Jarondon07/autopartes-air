ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."exchange_rate_source";--> statement-breakpoint
CREATE TYPE "public"."exchange_rate_source" AS ENUM('bcv', 'euro', 'intervencion', 'usdt');--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE "public"."exchange_rate_source" USING "source"::"public"."exchange_rate_source";