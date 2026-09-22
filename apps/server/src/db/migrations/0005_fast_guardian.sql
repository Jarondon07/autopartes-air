ALTER TABLE "categories" DROP CONSTRAINT "categories_code_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "code";