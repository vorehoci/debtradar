ALTER TABLE "todos" ADD COLUMN "is_valid" boolean;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "valid_by" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "valid_at" timestamp with time zone;