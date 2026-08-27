import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm"
import type { Band } from "@/lib/describe"
import { fingerprint } from "@/lib/fingerprint"
import { effectiveBand } from "./ranking"
import { MAX_COMMENT_LENGTH, type TodoCommentRow } from "@/lib/todo-comments"
import type { CommentCandidate } from "@/lib/todos"
import { db } from "./index"
import { deepScanCandidates, installations, repositories, todoComments, todos } from "./schema"

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
      .groupBy(repositories.id, repositories.owner, repositories.name, repositories.defaultBranch)
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

/**
 * Records whether a person thinks this is a real TODO, or clears the answer.
 *
 * Same single-statement permission test as the other writes: the access check
 * is a subquery in the WHERE clause, so there is no path that updates without
 * having checked and no window between the two.
 */
export async function setValidity(params: {
  todoId: string
  isValid: boolean | null
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
      isValid: params.isValid,
      // Cleared with the answer: "decided by nobody, never" is the honest
      // record once a row is back to unanswered.
      validBy: params.isValid === null ? null : params.by,
      validAt: params.isValid === null ? null : new Date(),
    })
    .where(and(eq(todos.id, params.todoId), inArray(todos.repositoryId, permitted)))
    .returning({ repositoryId: todos.repositoryId })

  return row ?? null
}

/**
 * Every comment in a repository, oldest first.
 *
 * Scoped by repository rather than by a list of TODO ids so it can run
 * alongside the card queries instead of after them — waiting for the ids added
 * a serial ~96ms to every board render, which is most of what a filter click
 * felt like. Comments are user-written and rare, so fetching the repository's
 * whole set is cheaper than the round trip it replaces.
 */
export async function commentsForRepository(repositoryId: number): Promise<TodoCommentRow[]> {
  return db
    .select({
      id: todoComments.id,
      todoId: todoComments.todoId,
      body: todoComments.body,
      authorLogin: todoComments.authorLogin,
      createdAt: todoComments.createdAt,
    })
    .from(todoComments)
    .innerJoin(todos, eq(todos.id, todoComments.todoId))
    .where(eq(todos.repositoryId, repositoryId))
    .orderBy(todoComments.createdAt)
}

/** One request cannot dismiss an unbounded number of rows. */
export const MAX_BULK_DISMISS = 200

/**
 * Marks several TODOs "not a real TODO" at once.
 *
 * The permission test is the same subquery used by the single-row writes, so a
 * list containing ids from a repository the caller cannot see silently drops
 * those rows rather than failing the whole call — a partial success is the
 * honest outcome when the request was partly illegitimate.
 */
/** Puts dismissed rows back on the board. A wrong click must be reversible. */
export async function restoreTodos(params: {
  todoIds: string[]
  installationIds: number[]
}): Promise<{ restored: number; repositoryId: number | null }> {
  const ids = params.todoIds.slice(0, MAX_BULK_DISMISS)
  if (ids.length === 0 || params.installationIds.length === 0) {
    return { restored: 0, repositoryId: null }
  }

  const permitted = db
    .select({ id: repositories.id })
    .from(repositories)
    .where(inArray(repositories.installationId, params.installationIds))

  const rows = await db
    .update(todos)
    .set({ dismissedAt: null, dismissedBy: null })
    .where(and(inArray(todos.id, ids), inArray(todos.repositoryId, permitted)))
    .returning({ repositoryId: todos.repositoryId })

  return { restored: rows.length, repositoryId: rows[0]?.repositoryId ?? null }
}

/**
 * Marks several rows as things we should never have surfaced.
 *
 * The sibling of `dismissTodos`, and deliberately a separate function writing
 * separate columns. Batch misdetection is the single most valuable label this
 * product can collect — when the classifier misfires it usually misfires on a
 * pattern, so forty rows at once say far more about what is wrong than forty
 * scattered ones would.
 */
export async function markNotTodos(params: {
  todoIds: string[]
  by: string
  installationIds: number[]
}): Promise<{ marked: number; repositoryId: number | null }> {
  const ids = params.todoIds.slice(0, MAX_BULK_DISMISS)
  if (ids.length === 0 || params.installationIds.length === 0) {
    return { marked: 0, repositoryId: null }
  }

  const permitted = db
    .select({ id: repositories.id })
    .from(repositories)
    .where(inArray(repositories.installationId, params.installationIds))

  const rows = await db
    .update(todos)
    .set({ isValid: false, validBy: params.by, validAt: new Date() })
    .where(and(inArray(todos.id, ids), inArray(todos.repositoryId, permitted)))
    .returning({ repositoryId: todos.repositoryId })

  return { marked: rows.length, repositoryId: rows[0]?.repositoryId ?? null }
}

export async function dismissTodos(params: {
  todoIds: string[]
  by: string
  installationIds: number[]
}): Promise<{ dismissed: number; repositoryId: number | null }> {
  const ids = params.todoIds.slice(0, MAX_BULK_DISMISS)
  if (ids.length === 0 || params.installationIds.length === 0) {
    return { dismissed: 0, repositoryId: null }
  }

  const permitted = db
    .select({ id: repositories.id })
    .from(repositories)
    .where(inArray(repositories.installationId, params.installationIds))

  // Writes the dismissal columns, never `isValid`. Those were one field, and
  // sharing it meant every dismissal was recorded as a detection error.
  const rows = await db
    .update(todos)
    .set({ dismissedAt: new Date(), dismissedBy: params.by })
    .where(and(inArray(todos.id, ids), inArray(todos.repositoryId, permitted)))
    .returning({ repositoryId: todos.repositoryId })

  return { dismissed: rows.length, repositoryId: rows[0]?.repositoryId ?? null }
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

/**
 * One repository, only if it belongs to a caller's installation.
 *
 * The access check lives in the query rather than in the page: a repository id
 * is a guessable URL, so filtering the list without also filtering the detail
 * lookup would leave every repo readable by anyone who typed the right number.
 * Null means both "does not exist" and "not yours", deliberately.
 */
export async function getRepository(id: number, installationIds: number[]) {
  if (installationIds.length === 0) return null

  const [row] = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.id, id), inArray(repositories.installationId, installationIds)))
    .limit(1)

  return row ?? null
}

export async function recordDeepScan(
  repositoryId: number,
  found: number,
  sha: string,
): Promise<void> {
  await db
    .update(repositories)
    .set({ deepScanAt: new Date(), deepScanFound: found, deepScanSha: sha })
    .where(eq(repositories.id, repositoryId))
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
    .where(and(eq(todos.id, todoId), inArray(repositories.installationId, installationIds)))
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

/**
 * How long an enrichment stays believable.
 *
 * `file_churn` and `author_last_active_at` are two of the four ranking signals,
 * and both are statements about the present: how hot this file is *now*, and
 * whether the author is still around *now*. This query used to ask only for
 * rows with no enrichment at all, so every row was measured once and never
 * again — a year later the board would still be ranking a departed author as
 * active, and saying so in the panel.
 *
 * Thirty days is chosen against what the values can do in that time rather than
 * from habit: annual churn barely moves in a month, and `ORPHAN_CAP_DAYS` is a
 * year, so a month is at most a twelfth of that scale.
 */
export const ENRICHMENT_TTL_DAYS = 30

/**
 * Open TODOs whose enrichment is missing or stale.
 *
 * Never-enriched rows come first: they have no author and no churn at all, so
 * they are ranked on two signals out of four until this runs.
 */
export async function unenrichedTodos(repositoryId: number, limit = 200): Promise<PendingTodo[]> {
  const staleBefore = new Date(Date.now() - ENRICHMENT_TTL_DAYS * 24 * 60 * 60 * 1000)

  return db
    .select({ id: todos.id, filePath: todos.filePath, line: todos.line })
    .from(todos)
    .where(
      and(
        eq(todos.repositoryId, repositoryId),
        isNull(todos.resolvedAt),
        or(isNull(todos.enrichedAt), lt(todos.enrichedAt, staleBefore)),
      ),
    )
    .orderBy(sql`${todos.enrichedAt} asc nulls first`)
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

  // Written on every default-branch scan, including one that found nothing —
  // that is the case the old derived-from-todos answer got wrong, and the whole
  // reason these columns exist.
  await db
    .update(repositories)
    .set({ lastScanSha: params.sha, lastScanAt: now })
    .where(eq(repositories.id, params.repositoryId))

  return { seen: byPrint.size, resolved }
}

/**
 * Postgres allows 65,535 bound parameters in one statement, and each candidate
 * binds six columns. 5,000 rows is 30,000 parameters — comfortably inside the
 * limit with room for the number of columns to grow.
 */
const STAGE_BATCH = 5_000

/**
 * Parks a deep scan's unmarked comments where the classification steps can page
 * through them, and returns how many there are.
 *
 * The delete covers the whole repository rather than this run's sha: a run that
 * dies between staging and cleanup would otherwise leave its rows behind
 * forever, and only the next run is ever in a position to notice.
 *
 * Deduplicated here by the same `(file, text)` fingerprint the todos table uses.
 * It has to happen before the slicing, not inside it — two identical comments
 * that fall either side of a chunk boundary would otherwise be classified twice
 * and counted twice, and paying Claude to answer the same question twice is the
 * cheaper half of that problem.
 */
export async function stageDeepScanCandidates(params: {
  repositoryId: number
  sha: string
  candidates: CommentCandidate[]
}): Promise<number> {
  await db
    .delete(deepScanCandidates)
    .where(eq(deepScanCandidates.repositoryId, params.repositoryId))

  const byPrint = new Map<string, CommentCandidate>()
  for (const candidate of params.candidates) {
    byPrint.set(fingerprint(candidate.file, candidate.text), candidate)
  }

  const rows = [...byPrint.values()].map((candidate, seq) => ({
    repositoryId: params.repositoryId,
    sha: params.sha,
    seq,
    filePath: candidate.file,
    line: candidate.line,
    text: candidate.text,
  }))

  for (let start = 0; start < rows.length; start += STAGE_BATCH) {
    await db.insert(deepScanCandidates).values(rows.slice(start, start + STAGE_BATCH))
  }

  return rows.length
}

/**
 * One chunk of staged candidates, in the order they were collected.
 *
 * `marker` is always null: the collect step only stages comments the regex pass
 * did not flag, which is the entire point of the deep scan.
 */
export async function deepScanCandidateSlice(params: {
  repositoryId: number
  sha: string
  start: number
  limit: number
}): Promise<CommentCandidate[]> {
  const rows = await db
    .select({
      file: deepScanCandidates.filePath,
      line: deepScanCandidates.line,
      text: deepScanCandidates.text,
    })
    .from(deepScanCandidates)
    .where(
      and(
        eq(deepScanCandidates.repositoryId, params.repositoryId),
        eq(deepScanCandidates.sha, params.sha),
        gte(deepScanCandidates.seq, params.start),
      ),
    )
    .orderBy(asc(deepScanCandidates.seq))
    .limit(params.limit)

  return rows.map((row) => ({ ...row, marker: null }))
}

/** Drops a finished run's scratch rows. */
export async function clearDeepScanCandidates(repositoryId: number): Promise<void> {
  await db.delete(deepScanCandidates).where(eq(deepScanCandidates.repositoryId, repositoryId))
}
