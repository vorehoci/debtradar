ALTER TABLE "repositories" ADD COLUMN "last_scan_sha" text;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "last_scan_at" timestamp with time zone;