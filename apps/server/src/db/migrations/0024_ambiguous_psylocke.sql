ALTER TABLE "users" ADD COLUMN "security_pin" varchar(100);--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "original_price_usd" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "authorized_by" integer;--> statement-breakpoint
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;