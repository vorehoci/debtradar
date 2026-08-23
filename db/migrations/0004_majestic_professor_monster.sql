ALTER TABLE "todos" ADD COLUMN "fixable" boolean;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "fix_scope" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "fix_summary" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "fix_confidence" real;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "fix_analyzed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "fix_analyzed_sha" text;