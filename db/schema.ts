import {
  boolean,
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const installations = pgTable("installations", {
  /** GitHub's installation id — not generated here. */
  id: bigint("id", { mode: "number" }).primaryKey(),
  accountLogin: text("account_login").notNull(),
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
  /** Set when the app is uninstalled; rows are kept so history survives a reinstall. */
  removedAt: timestamp("removed_at", { withTimezone: true }),
})

export const repositories = pgTable("repositories", {
  /** GitHub's repository id. Survives renames, unlike owner/name. */
  id: bigint("id", { mode: "number" }).primaryKey(),
  installationId: bigint("installation_id", { mode: "number" })
    .notNull()
    .references(() => installations.id, { onDelete: "cascade" }),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  defaultBranch: text("default_branch").notNull(),

  /**
   * When Claude last read this repository's unmarked comments looking for TODOs
   * nobody labelled.
   *
   * Recorded because the scan costs real money and takes minutes: without a
   * visible "last run", the only way to know whether it is worth running again
   * is to run it again.
   */
  deepScanAt: timestamp("deep_scan_at", { withTimezone: true }),
  deepScanFound: integer("deep_scan_found"),
  /**
   * The commit the last deep scan judged.
   *
   * Kept because the job is idempotent on the head sha: a second request for the
   * same commit is dropped by Inngest and never runs, so without this the app
   * cannot tell "queued" from "silently discarded" and would wait for a result
   * that is never coming.
   */
  deepScanSha: text("deep_scan_sha"),

  /**
   * The default-branch commit the last regular scan read, and when.
   *
   * Derived from the todos table before this existed, which was wrong in the
   * case that matters: a scan finding nothing new touches no todo row, so a
   * repository scanned an hour ago looked identical to one last scanned in
   * March. A repository with no TODOs at all had no evidence it had ever been
   * scanned.
   *
   * Only default-branch scans write here. Pull request scans deliberately do
   * not — they read a branch nobody is asking about on this page, and recording
   * one would report the repository as fresher than it is.
   */
  lastScanSha: text("last_scan_sha"),
  lastScanAt: timestamp("last_scan_at", { withTimezone: true }),
})

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repositoryId: bigint("repository_id", { mode: "number" })
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),

    /**
     * Identity across commits: a hash of the file path and the normalised
     * comment text. Line numbers shift constantly, so they cannot be part of
     * this — see lib/fingerprint.ts for what is and isn't stable.
     */
    fingerprint: text("fingerprint").notNull(),

    filePath: text("file_path").notNull(),
    /** Best-known line as of `lastSeenSha`, for deep links. Not part of identity. */
    line: integer("line").notNull(),
    text: text("text").notNull(),

    /** Conventional marker (TODO, FIXME…), or null when the LLM found it. */
    marker: text("marker"),
    /** LLM category, null for regex-marked rows. */
    category: text("category"),
    confidence: real("confidence"),

    /** From git blame. Null until enrichment runs. */
    authorLogin: text("author_login"),
    /** The commit blame attributes this line to. */
    authoredSha: text("authored_sha"),
    /**
     * When the comment was actually written — which is not `firstSeenAt`, the
     * moment debtradar noticed it. A TODO from 2019 in a repo installed today
     * has a firstSeenAt of today, so age must come from here.
     */
    authoredAt: timestamp("authored_at", { withTimezone: true }),
    /** Most recent commit by this author in this repo; stale means orphaned. */
    authorLastActiveAt: timestamp("author_last_active_at", { withTimezone: true }),
    /** Commits touching this file in the last year — how hot the surrounding code is. */
    fileChurn: integer("file_churn"),
    /** Null means enrichment has not run for this row yet. */
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),

    firstSeenSha: text("first_seen_sha").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenSha: text("last_seen_sha").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),

    /** Null while open. Set when a scan of the default branch no longer finds it. */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    /**
     * A band chosen by a person, overriding the computed one.
     *
     * Stored separately rather than by adjusting the score: the score is
     * recomputed on every query from age and author activity, so a written-back
     * value would be overwritten within a day. Keeping the human judgement in
     * its own column also makes it visible as a judgement.
     */
    manualBand: text("manual_band"),
    manualBandBy: text("manual_band_by"),
    manualBandAt: timestamp("manual_band_at", { withTimezone: true }),

    /**
     * Claude's read on whether this TODO is actionable.
     *
     * Cached on the row because the analysis costs real money per click and the
     * answer only changes when the surrounding code does — `fixAnalyzedSha`
     * records which commit it was judged against, so a stale verdict is
     * recognisable rather than merely old.
     */
    /**
     * A person's answer to "is this a real TODO?".
     *
     * Deliberately separate from `manualBand`: the band says how much something
     * matters, this says whether we should have surfaced it at all. Collapsing
     * them would make the label useless as training signal, because "no" would
     * mean either "you misread this comment" or "this is real but trivial".
     *
     * Null means nobody has said. False hides the row from the board without
     * deleting it — a wrong answer must be reversible.
     */
    isValid: boolean("is_valid"),
    validBy: text("valid_by"),
    validAt: timestamp("valid_at", { withTimezone: true }),

    /**
     * Hidden by a person because they do not want to see it — a triage
     * decision, not a judgement about detection.
     *
     * Separate from `isValid` because the two were the same column and it
     * ruined the label. Dismissing wrote `is_valid = false`, so the fastest way
     * to clear a row was to declare it fake, and 23 of the first 29 "not a real
     * TODO" answers landed on unambiguous `FIXME:` and `TODO:` comments in
     * cal.com. The column meant to answer "did we misread this?" was recording
     * "I do not care about this", which is the one thing it must not mean.
     *
     * Both hide a row. Only `isValid` is training signal.
     */
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    dismissedBy: text("dismissed_by"),

    fixable: boolean("fixable"),
    fixScope: text("fix_scope"),
    fixSummary: text("fix_summary"),
    fixConfidence: real("fix_confidence"),
    fixAnalyzedAt: timestamp("fix_analyzed_at", { withTimezone: true }),
    fixAnalyzedSha: text("fix_analyzed_sha"),
  },
  (table) => [
    // The upsert target: one row per distinct comment per repo.
    uniqueIndex("todos_identity").on(table.repositoryId, table.fingerprint),
    // The dashboard's main query: open TODOs for a repo, oldest first.
    index("todos_open").on(table.repositoryId, table.resolvedAt, table.firstSeenAt),
    // The enrichment job's work queue.
    index("todos_unenriched").on(table.repositoryId, table.enrichedAt),
  ],
)

/**
 * Notes people leave on a TODO.
 *
 * Cascades with the row: a comment about a TODO that no longer exists has no
 * subject. Resolved TODOs keep their rows, so resolving does not lose history —
 * only a repository being removed does.
 */
export const todoComments = pgTable(
  "todo_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    todoId: uuid("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorLogin: text("author_login").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("todo_comments_todo").on(table.todoId, table.createdAt)],
)

/**
 * Unmarked comments waiting on Claude, for the life of one deep scan.
 *
 * A scratch table, not a record of anything. It exists because Inngest caps a
 * single step output at 4 MiB and the collect step used to return every
 * candidate it found — on a repository the size of cal.com that is roughly
 * 20,000 of them, which lands on the cap. The step now writes them here and
 * returns a count, and each classification step reads back only its own slice
 * by `seq`. Nothing large crosses a step boundary any more.
 *
 * Rows are deleted when the run finishes. They are also deleted for the whole
 * repository when a run starts, so an abandoned run cleans up after its
 * successor rather than lingering forever.
 *
 * No id column: `(repository_id, sha, seq)` already identifies a row, and the
 * primary key doubles as the index the slice query reads.
 */
export const deepScanCandidates = pgTable(
  "deep_scan_candidates",
  {
    repositoryId: bigint("repository_id", { mode: "number" })
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    /** Head commit of the run these belong to. */
    sha: text("sha").notNull(),
    /** Position in the collected order — the cursor the chunk steps page by. */
    seq: integer("seq").notNull(),
    filePath: text("file_path").notNull(),
    line: integer("line").notNull(),
    text: text("text").notNull(),
  },
  (table) => [primaryKey({ columns: [table.repositoryId, table.sha, table.seq] })],
)

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
export type TodoComment = typeof todoComments.$inferSelect
