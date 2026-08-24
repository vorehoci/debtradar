ALTER TABLE "repositories" ADD COLUMN "deep_scan_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "deep_scan_found" integer;