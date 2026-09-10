ALTER TABLE "products" ADD COLUMN "part_number" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "year_from" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "year_to" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_part_number_unique" UNIQUE("part_number");