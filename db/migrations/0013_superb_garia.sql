CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"placement" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "funnel_events_name" ON "funnel_events" USING btree ("name","created_at");