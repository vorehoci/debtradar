import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { fingerprint } from "@/lib/fingerprint"
import type { CommentCandidate } from "@/lib/todos"
import { db } from "./index"
import { installations, repositories, todos } from "./schema"

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
