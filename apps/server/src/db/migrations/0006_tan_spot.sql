CREATE TABLE "car_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"logo_url" varchar(300),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_models_brand_name" UNIQUE("brand_id","name")
);
--> statement-breakpoint
ALTER TABLE "car_models" ADD CONSTRAINT "car_models_brand_id_car_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."car_brands"("id") ON DELETE no action ON UPDATE no action;