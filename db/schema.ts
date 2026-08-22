import {
  bigint,
  index,
  integer,
  pgTable,
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

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
