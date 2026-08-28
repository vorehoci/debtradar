CREATE TABLE "model_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"operation" text NOT NULL,
	"repository_id" bigint,
	"installation_id" bigint,
	"model" text NOT NULL,
	"requests" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer NOT NULL,
	"cache_write_tokens" integer NOT NULL,
	"cost_usd" real,
	"duration_ms" integer NOT NULL,
	"comments_judged" integer,
	"lines_scanned" integer
);
--> statement-breakpoint
CREATE INDEX "model_usage_repository" ON "model_usage" USING btree ("repository_id","created_at");