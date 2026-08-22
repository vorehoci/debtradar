ALTER TABLE "todos" ADD COLUMN "authored_sha" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "authored_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "author_last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "file_churn" integer;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "enriched_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "todos_unenriched" ON "todos" USING btree ("repository_id","enriched_at");