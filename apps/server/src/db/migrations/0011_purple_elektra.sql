ALTER TABLE "products" ALTER COLUMN "stock" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "min_stock" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "purchase_details" ALTER COLUMN "quantity" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "sale_details" ALTER COLUMN "quantity" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "quantity" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "stock_after" SET DATA TYPE bigint;