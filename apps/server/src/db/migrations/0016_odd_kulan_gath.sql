ALTER TABLE "exchange_rates" ALTER COLUMN "rate_bs_per_usd" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "exchange_rate" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "exchange_rate" SET DATA TYPE numeric(14, 2);