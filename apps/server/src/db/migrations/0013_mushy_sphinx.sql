CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "warehouse_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;