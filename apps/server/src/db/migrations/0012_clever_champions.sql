ALTER TABLE "product_car_models" ADD COLUMN "year_from" integer;--> statement-breakpoint
ALTER TABLE "product_car_models" ADD COLUMN "year_to" integer;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "year_from";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "year_to";