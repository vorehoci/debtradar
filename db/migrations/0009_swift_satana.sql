CREATE TABLE "deep_scan_candidates" (
	"repository_id" bigint NOT NULL,
	"sha" text NOT NULL,
	"seq" integer NOT NULL,
	"file_path" text NOT NULL,
	"line" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "deep_scan_candidates_repository_id_sha_seq_pk" PRIMARY KEY("repository_id","sha","seq")
);
--> statement-breakpoint
ALTER TABLE "deep_scan_candidates" ADD CONSTRAINT "deep_scan_candidates_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;