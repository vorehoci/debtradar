ALTER TABLE "todos" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "dismissed_by" text;--> statement-breakpoint
-- Existing hidden rows were hidden through `is_valid = false`, which was the
-- only way to hide one. Carry them over so nothing reappears on the board.
--
-- `is_valid` is deliberately left alone rather than cleared. Those labels are
-- known to be contaminated -- most are dismissals, not detection errors -- but
-- they are a person's answers and deleting them is not this migration's call.
UPDATE "todos"
SET "dismissed_at" = COALESCE("valid_at", now()),
    "dismissed_by" = "valid_by"
WHERE "is_valid" = false;
