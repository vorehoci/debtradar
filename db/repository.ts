import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Band } from "@/lib/describe"
import { fingerprint } from "@/lib/fingerprint"
import { effectiveBand } from "./ranking"
import { MAX_COMMENT_LENGTH, type TodoCommentRow } from "@/lib/todo-comments"
import type { CommentCandidate } from "@/lib/todos"
import { db } from "./index"
import { installations, repositories, todoComments, todos } from "./schema"

export interface FoundTodo extends CommentCandidate {
  category?: string | null
  confidence?: number | null
}

/** Creates or refreshes the installation and repository rows a scan depends on. */
export async function ensureRepository(params: {
  installationId: number
  accountLogin: string
  repositoryId: number
  owner: string
  name: string
  defaultBranch: string
}): Promise<void> {
  await db
    .insert(installations)
    .values({ id: params.installationId, accountLogin: params.accountLogin })
    .onConflictDoUpdate({
      target: installations.id,
      // Clear removedAt: this is a reinstall, and the history is still valid.
      set: { accountLogin: params.accountLogin, removedAt: null },
    })

  await db
    .insert(repositories)
    .values({
      id: params.repositoryId,
      installationId: params.installationId,
      owner: params.owner,
      name: params.name,
      defaultBranch: params.defaultBranch,
    })
    .onConflictDoUpdate({
      target: repositories.id,
      // Repos get renamed and transferred; the id is what stays put.
      set: {
        installationId: params.installationId,
        owner: params.owner,
        name: params.name,
        defaultBranch: params.defaultBranch,
      },
    })
}

export async function listRepositories(installationIds: number[]) {
  // An empty allow-list must return nothing, not everything — an `inArray` with
  // no values is the classic way to accidentally drop a filter entirely.
  if (installationIds.length === 0) return []

  return (
    db
      .select({
        id: repositories.id,
        owner: repositories.owner,
        name: repositories.name,
        defaultBranch: repositories.defaultBranch,
        // The `todos.id is not null` guard matters: a repository with no rows
        // still produces one all-null row from the left join, and that row's
        // resolved_at is null, so it would otherwise count as an open TODO.
        open: sql<number>`count(*) filter (
          where ${todos.id} is not null and ${todos.resolvedAt} is null
        )::int`,
        resolved: sql<number>`count(*) filter (where ${todos.resolvedAt} is not null)::int`,
        // Counted by effective band, not by score range, so a repository whose
        // TODOs were raised by hand reports what the board actually shows.
        //
        // The `todos.id is not null` guard is load-bearing in both: Postgres
        // `least(NULL, 1.0)` returns 1.0, so the all-null row a left join
        // produces for an empty repository would otherwise score as maximally
        // aged and be counted as critical.
        critical: sql<number>`count(*) filter (
          where ${todos.id} is not null and ${todos.resolvedAt} is null
            and ${effectiveBand} = 'critical'
        )::int`,
        high: sql<number>`count(*) filter (
          where ${todos.id} is not null and ${todos.resolvedAt} is null
            and ${effectiveBand} = 'high'
        )::int`,
      })
      .from(repositories)
      // A join rather than correlated subqueries: inside a raw subquery Drizzle
      // emits unqualified column names, which then bind to the wrong table.
      .leftJoin(todos, eq(todos.repositoryId, repositories.id))
      .where(inArray(repositories.installationId, installationIds))
      .groupBy(
        repositories.id,
        repositories.owner,
        repositories.name,
        repositories.defaultBranch,
      )
      .orderBy(repositories.owner, repositories.name)
  )
}

/**
 * Sets or clears a human-chosen band, returning null when the caller may not
 * touch this row.
 *
 * The access check is a subquery in the WHERE clause rather than a separate
 * lookup, so there is no window between checking and writing, and no code path
 * that can update without having checked.
 */
export async function setManualBand(params: {
  todoId: string
  band: Band | null
  by: string
  installationIds: number[]
}): Promise<{ repositoryId: number } | null> {
  if (params.installationIds.length === 0) return null

  const permitted = db
    .select({ id: repositories.id })
    .from(repositories)
    .where(inArray(repositories.installationId, params.installationIds))

  const [row] = await db
    .update(todos)
    .set({
      manualBand: params.band,
      // Cleared together with the band: "set by nobody, never" is the honest
      // record once a row is back to automatic.
      manualBandBy: params.band ? params.by : null,
      manualBandAt: params.band ? new Date() : null,
    })
    .where(and(eq(todos.id, params.todoId), inArray(todos.repositoryId, permitted)))
    .returning({ repositoryId: todos.repositoryId })

  return row ?? null
}

/** Comments for the TODOs currently on screen, oldest first. */
export async function commentsFor(todoIds: string[]): Promise<TodoCommentRow[]> {
  if (todoIds.length === 0) return []

  return db
    .select({
      id: todoComments.id,
      todoId: todoComments.todoId,
      body: todoComments.body,
      authorLogin: todoComments.authorLogin,
      createdAt: todoComments.createdAt,
    })
    .from(todoComments)
    .where(inArray(todoComments.todoId, todoIds))
    .orderBy(todoComments.createdAt)
}

/**
 * Adds a comment, returning null when the caller may not see the TODO.
 *
 * Written as INSERT ... SELECT ... WHERE EXISTS so the permission test and the
 * write are one statement: a separate check followed by an insert would leave a
 * window, and a code path that could insert without having checked.
 */
export async function addComment(params: {
  todoId: string
  body: string
  authorLogin: string
  installationIds: number[]
}): Promise<{ repositoryId: number } | null> {
  const body = params.body.trim().slice(0, MAX_COMMENT_LENGTH)
  if (!body || params.installationIds.length === 0) return null

  const permitted = sql.join(
    params.installationIds.map((id) => sql`${id}`),
    sql`, `,
  )

  const rows = await db.execute<{ repository_id: number }>(sql`
    insert into ${todoComments} (todo_id, body, author_login)
    select ${params.todoId}::uuid, ${body}, ${params.authorLogin}
    where exists (
      select 1
      from ${todos} t
      join ${repositories} r on r.id = t.repository_id
      where t.id = ${params.todoId}::uuid
        and r.installation_id in (${permitted})
    )
    returning (
      select t.repository_id from ${todos} t where t.id = ${params.todoId}::uuid
    ) as repository_id
  `)

  const row = rows[0]
  return row ? { repositoryId: Number(row.repository_id) } : null
}

export interface TodoForAnalysis {
  id: string
  repositoryId: number
  installationId: number
  owner: string
  name: string
  defaultBranch: string
  filePath: string
  line: number
  text: string
  marker: string | null
  lastSeenSha: string
  fixAnalyzedSha: string | null
}

/**
 * A TODO plus the installation needed to read its file, or null when the caller
 * has no access.
 *
 * The join both fetches and authorises: there is no version of this that
 * returns a row the caller may not see.
 */
export async function todoForAnalysis(
  todoId: string,
  installationIds: number[],
): Promise<TodoForAnalysis | null> {
  if (installationIds.length === 0) return null

  const [row] = await db
    .select({
      id: todos.id,
      repositoryId: todos.repositoryId,
      installationId: repositories.installationId,
      owner: repositories.owner,
      name: repositories.name,
      defaultBranch: repositories.defaultBranch,
      filePath: todos.filePath,
      line: todos.line,
      text: todos.text,
      marker: todos.marker,
      lastSeenSha: todos.lastSeenSha,
      fixAnalyzedSha: todos.fixAnalyzedSha,
    })
    .from(todos)
    .innerJoin(repositories, eq(repositories.id, todos.repositoryId))
    .where(
      and(
        eq(todos.id, todoId),
        inArray(repositories.installationId, installationIds),
      ),
    )
    .limit(1)

  return row ?? null
}

export async function saveFixAnalysis(params: {
  todoId: string
  sha: string
  fixable: boolean
  scope: string
  summary: string
  confidence: number
}): Promise<void> {
  await db
    .update(todos)
    .set({
      fixable: params.fixable,
      fixScope: params.scope,
      fixSummary: params.summary,
      fixConfidence: params.confidence,
      fixAnalyzedAt: new Date(),
      fixAnalyzedSha: params.sha,
    })
    .where(eq(todos.id, params.todoId))
}

export interface PendingTodo {
  id: string
  filePath: string
  line: number
}

/** Open TODOs in this repo that enrichment has not touched yet. */
export async function unenrichedTodos(
  repositoryId: number,
  limit = 200,
): Promise<PendingTodo[]> {
  return db
    .select({ id: todos.id, filePath: todos.filePath, line: todos.line })
    .from(todos)
    .where(
      and(
        eq(todos.repositoryId, repositoryId),
        isNull(todos.enrichedAt),
        isNull(todos.resolvedAt),
      ),
    )
    .limit(limit)
}

export interface Enrichment {
  id: string
  authorLogin: string | null
  authoredSha: string | null
  authoredAt: Date | null
  authorLastActiveAt: Date | null
  fileChurn: number | null
}

/**
 * Writes enrichment results back.
 *
 * `enrichedAt` is set even when blame returned nothing, so a file that cannot
 * be blamed does not get retried on every subsequent scan forever.
 */
export async function applyEnrichment(rows: Enrichment[]): Promise<number> {
  if (rows.length === 0) return 0
  const now = new Date()

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .update(todos)
        .set({
          authorLogin: row.authorLogin,
          authoredSha: row.authoredSha,
          authoredAt: row.authoredAt,
          authorLastActiveAt: row.authorLastActiveAt,
          fileChurn: row.fileChurn,
          enrichedAt: now,
        })
        .where(eq(todos.id, row.id))
    }
  })

  return rows.length
}

/**
 * Applies one scan of the default branch: comments still present are upserted,
 * comments the diff removed are marked resolved.
 */
export async function recordScan(params: {
  repositoryId: number
  sha: string
  found: FoundTodo[]
  removed: CommentCandidate[]
}): Promise<{ seen: number; resolved: number }> {
  const now = new Date()

  // Resolve first, so a comment that is removed and re-added in the same push
  // ends up open rather than resolved.
  let resolved = 0
  const removedPrints = params.removed.map((c) => fingerprint(c.file, c.text))
  if (removedPrints.length > 0) {
    const rows = await db
      .update(todos)
      .set({ resolvedAt: now })
      .where(
        and(
          eq(todos.repositoryId, params.repositoryId),
          inArray(todos.fingerprint, removedPrints),
          isNull(todos.resolvedAt),
        ),
      )
      .returning({ id: todos.id })
    resolved = rows.length
  }

  // One INSERT cannot touch the same conflict target twice, so identical
  // comments within a single push have to collapse to one row first.
  const byPrint = new Map<string, FoundTodo>()
  for (const c of params.found) {
    byPrint.set(fingerprint(c.file, c.text), c)
  }

  if (byPrint.size > 0) {
    const values = [...byPrint].map(([print, c]) => ({
      repositoryId: params.repositoryId,
      fingerprint: print,
      filePath: c.file,
      line: c.line,
      text: c.text,
      marker: c.marker,
      category: c.category ?? null,
      confidence: c.confidence ?? null,
      firstSeenSha: params.sha,
      firstSeenAt: now,
      lastSeenSha: params.sha,
      lastSeenAt: now,
    }))

    await db
      .insert(todos)
      .values(values)
      .onConflictDoUpdate({
        target: [todos.repositoryId, todos.fingerprint],
        set: {
          // firstSeen* deliberately absent — the original sighting is the age,
          // and the age is what the whole ranking rests on.
          filePath: sql`excluded.file_path`,
          line: sql`excluded.line`,
          text: sql`excluded.text`,
          lastSeenSha: sql`excluded.last_seen_sha`,
          lastSeenAt: sql`excluded.last_seen_at`,
          // A TODO that comes back (a revert, say) reopens rather than staying closed.
          resolvedAt: null,
        },
      })
  }

  return { seen: byPrint.size, resolved }
}
