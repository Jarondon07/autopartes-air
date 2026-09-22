CREATE TABLE "product_car_models" (
	"product_id" integer NOT NULL,
	"car_model_id" integer NOT NULL,
	CONSTRAINT "product_car_models_product_id_car_model_id_pk" PRIMARY KEY("product_id","car_model_id")
);
--> statement-breakpoint
ALTER TABLE "car_brands" ADD COLUMN "abbreviation" varchar(10);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "abbreviation" varchar(10);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "car_brand_id" integer;--> statement-breakpoint
ALTER TABLE "product_car_models" ADD CONSTRAINT "product_car_models_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_car_models" ADD CONSTRAINT "product_car_models_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_car_brand_id_car_brands_id_fk" FOREIGN KEY ("car_brand_id") REFERENCES "public"."car_brands"("id") ON DELETE no action ON UPDATE no action;