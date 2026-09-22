ALTER TABLE "sale_payments" ADD COLUMN "paid_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD COLUMN "exchange_rate" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sale_payments" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD COLUMN "notes" varchar(200);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "is_credit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_payments_paid_idx" ON "sale_payments" USING btree ("paid_at");