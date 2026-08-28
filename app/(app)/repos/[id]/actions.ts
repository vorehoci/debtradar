"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { rankedTodos, type RankedTodo, type Source } from "@/db/ranking"
import {
  addComment,
  dismissTodos,
  markNotTodos,
  restoreTodos,
  getRepository,
  saveFixAnalysis,
  setManualBand,
  setValidity,
  todoForAnalysis,
} from "@/db/repository"
import { accessibleInstallationIds } from "@/lib/access"
import { type Band, parseBand } from "@/lib/describe"
import { PAGE_SIZE } from "@/lib/paging"
import { analyseFix, fetchFile } from "@/lib/fix-analysis"
import { recordScale, trackUsage } from "@/lib/usage"
import { installationClient } from "@/lib/github"
import { deepScanRequested, inngest } from "@/lib/inngest"
import { consume } from "@/db/rate-limit"

/**
 * A spend guard — see db/rate-limit.ts.
 *
 * It counts in Postgres now rather than in the process, so this is a real
 * ceiling per installation rather than a ceiling per server instance. That
 * distinction did not matter while the app was private and one person could
 * install it; it is the whole guard once anybody can.
 */
const ANALYSES_PER_HOUR = 60
const HOUR_MS = 60 * 60 * 1000

/**
 * Deep scans allowed per installation per day.
 *
 * Set to 3 when a scan meant Opus judging every comment with a justification —
 * roughly $28. On Haiku, returning only the hits, a run is about $0.20, and the
 * job is idempotent on the head commit so rescanning unchanged code costs
 * nothing at all. Twelve is a guard against a loop, not against ordinary use.
 */
const DEEP_SCANS_PER_DAY = 12
const DAY_MS = 24 * HOUR_MS

export type DeepScanResult =
  | { state: "queued" }
  | { state: "rate-limited"; resetInSeconds: number }
  /** This commit has already been judged; a queued job would be discarded. */
  | { state: "unchanged"; found: number }

export type FixAnalysisResult =
  { state: "ok" } | { state: "rate-limited"; resetInSeconds: number } | { state: "unreadable" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Server Actions are public HTTP endpoints, so every one of these re-reads the
 * session and re-asks GitHub what the caller may see; nothing is taken from the
 * client but the ids themselves.
 *
 * The shape check matters as much as the permission check: an id that is not a
 * uuid would reach Postgres as a failed cast and surface as a 500 rather than a
 * refusal, which is both noisier and more informative to whoever sent it.
 */
async function callerContext(todoId: string) {
  if (!UUID.test(todoId)) throw new Error("Not found")

  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  return {
    installationIds: await accessibleInstallationIds(session.accessToken),
    who: session.user?.name ?? session.user?.email ?? "unknown",
  }
}

function revalidate(repositoryId: number) {
  revalidatePath(`/repos/${repositoryId}`)
  revalidatePath("/dashboard")
}

/** Overrides a TODO's band, or returns it to automatic for an unknown value. */
export async function updateSeverity(todoId: string, rawBand: string) {
  const { installationIds, who } = await callerContext(todoId)

  const updated = await setManualBand({
    todoId,
    band: parseBand(rawBand),
    by: who,
    installationIds,
  })

  if (!updated) throw new Error("Not found")
  revalidate(updated.repositoryId)
}

/**
 * Analyses whether a TODO is actionable.
 *
 * Unlike every other action here, this one costs money each time it runs, and
 * it is triggered by a click rather than by a push — so it is the one surface
 * where somebody holding down a button has a real bill attached. Hence the
 * per-installation limit and the cached verdict.
 */
export async function analyseTodo(todoId: string): Promise<FixAnalysisResult> {
  const { installationIds } = await callerContext(todoId)

  const todo = await todoForAnalysis(todoId, installationIds)
  if (!todo) throw new Error("Not found")

  // A verdict judged against the current commit is still true; re-running would
  // spend money to produce the same answer.
  if (todo.fixAnalyzedSha === todo.lastSeenSha) {
    revalidate(todo.repositoryId)
    return { state: "ok" }
  }

  const limit = await consume(`analyse:${todo.installationId}`, ANALYSES_PER_HOUR, HOUR_MS)
  if (!limit.allowed) {
    return { state: "rate-limited", resetInSeconds: limit.resetInSeconds }
  }

  const octokit = await installationClient(todo.installationId)
  const source = await fetchFile(octokit, {
    owner: todo.owner,
    repo: todo.name,
    path: todo.filePath,
    ref: todo.lastSeenSha,
  })

  if (source === null) return { state: "unreadable" }

  const analysis = await trackUsage(
    {
      operation: "analyse-fix",
      repositoryId: todo.repositoryId,
      installationId: todo.installationId,
    },
    () => {
      recordScale({ commentsJudged: 1 })
      return analyseFix({
        comment: todo.text,
        marker: todo.marker,
        context: { path: todo.filePath, line: todo.line, source },
      })
    },
  )

  await saveFixAnalysis({
    todoId,
    sha: todo.lastSeenSha,
    fixable: analysis.fixable,
    scope: analysis.scope,
    summary: analysis.summary,
    confidence: analysis.confidence,
  })

  revalidate(todo.repositoryId)
  return { state: "ok" }
}

/**
 * Asks Claude to read the repository's unmarked comments for TODOs nobody
 * labelled.
 *
 * Queued rather than awaited: it streams a whole repository tarball and makes a
 * dozen model calls, which is minutes of work — far past what a Server Action
 * should hold a request open for. The page reports the last run instead of a
 * live progress bar.
 */
export async function startDeepScan(repositoryId: number): Promise<DeepScanResult> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  const installationIds = await accessibleInstallationIds(session.accessToken)
  const repo = await getRepository(repositoryId, installationIds)
  if (!repo) throw new Error("Not found")

  const limit = await consume(`deep-scan:${repo.installationId}`, DEEP_SCANS_PER_DAY, DAY_MS)
  if (!limit.allowed) {
    return { state: "rate-limited", resetInSeconds: limit.resetInSeconds }
  }

  const octokit = await installationClient(repo.installationId)
  const { data: ref } = await octokit.rest.git.getRef({
    owner: repo.owner,
    repo: repo.name,
    ref: `heads/${repo.defaultBranch}`,
  })

  /**
   * Caught here rather than left to the queue.
   *
   * The job is idempotent on the head sha, so a second request for a commit it
   * has already judged is dropped by Inngest and never runs. Sending it anyway
   * looks identical to a successful queue from the browser, which then waits for
   * a completion that cannot arrive. Answering directly is truthful and instant.
   */
  if (repo.deepScanSha === ref.object.sha) {
    return { state: "unchanged", found: repo.deepScanFound ?? 0 }
  }

  await inngest.send(
    deepScanRequested.create({
      installationId: repo.installationId,
      accountLogin: repo.owner,
      repositoryId,
      owner: repo.owner,
      repo: repo.name,
      defaultBranch: repo.defaultBranch,
      headSha: ref.object.sha,
    }),
  )

  return { state: "queued" }
}

/**
 * Answers "is this a real TODO?", or clears the answer.
 *
 * Kept separate from `updateSeverity` on purpose: the band says how much
 * something matters, this says whether we should have surfaced it at all. One
 * control answering both would produce a label that cannot be learned from,
 * because "no" would mean either "you misread this" or "this is trivial".
 */
export async function updateValidity(todoId: string, answer: "yes" | "no" | "unset") {
  const { installationIds, who } = await callerContext(todoId)

  const updated = await setValidity({
    todoId,
    isValid: answer === "unset" ? null : answer === "yes",
    by: who,
    installationIds,
  })

  if (!updated) throw new Error("Not found")
  revalidate(updated.repositoryId)
}

/**
 * Dismisses several TODOs in one go.
 *
 * Doing this one card at a time is the reason nobody would: a deep scan of
 * cal.com surfaces 165 rows of which roughly a third are wrong, and correcting
 * those individually is a quarter of an hour of clicking. The labelled feedback
 * only accumulates if correcting the tool is cheap.
 */
export async function dismissMany(todoIds: string[]): Promise<{ dismissed: number }> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  // Anything not shaped like an id is dropped rather than sent to Postgres as a
  // failed cast, which would surface as a 500 instead of a refusal.
  const ids = todoIds.filter((id) => UUID.test(id))
  if (ids.length === 0) return { dismissed: 0 }

  const installationIds = await accessibleInstallationIds(session.accessToken)
  const result = await dismissTodos({
    todoIds: ids,
    by: session.user?.name ?? session.user?.email ?? "unknown",
    installationIds,
  })

  if (result.repositoryId !== null) revalidate(result.repositoryId)
  return { dismissed: result.dismissed }
}

/**
 * Fetches the next page of one column.
 *
 * The board showed the top 20 of each band and a "+442 more" line, which named
 * the problem without solving it: on a repository the size of cal.com most of
 * the backlog was simply unreachable. Paging one column at a time rather than
 * re-rendering the page keeps the other three columns, the scroll position and
 * any selection exactly where they were.
 */
export async function loadMoreTodos(params: {
  repositoryId: number
  band: string
  offset: number
  source?: string
  search?: string
  includeDismissed?: boolean
  orphaned?: boolean
}): Promise<RankedTodo[]> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  const installationIds = await accessibleInstallationIds(session.accessToken)
  const repo = await getRepository(params.repositoryId, installationIds)
  if (!repo) throw new Error("Not found")

  // Everything below comes from the client, so each value is narrowed to what
  // the query accepts rather than passed through.
  const band: Band | null = parseBand(params.band)
  if (!band) throw new Error("Not found")
  const source: Source | undefined = params.source === "claude" ? "claude" : undefined
  const offset = Number.isFinite(params.offset) ? Math.max(0, Math.trunc(params.offset)) : 0

  return rankedTodos(params.repositoryId, {
    bands: [band],
    source,
    search: params.search,
    limit: PAGE_SIZE,
    offset,
    includeDismissed: params.includeDismissed === true,
    orphaned: params.orphaned === true,
  })
}

/**
 * Puts a dismissed row back on the board.
 *
 * Dismissal is a judgement call made in a second, so it needs an undo that is
 * equally cheap — otherwise people hesitate over every one, which is exactly
 * the friction bulk dismiss was built to remove.
 */
export async function restoreTodo(todoId: string) {
  const { installationIds } = await callerContext(todoId)

  const result = await restoreTodos({ todoIds: [todoId], installationIds })
  if (result.repositoryId === null) throw new Error("Not found")

  revalidate(result.repositoryId)
}

/** Lines of code shown either side of the comment. */
const CONTEXT_RADIUS = 8

export type CodeContext = { startLine: number; lines: string[] } | null

/**
 * The lines around a finding, for the detail panel.
 *
 * Judging a TODO from the comment alone is guessing. The only way to see the
 * code was "Open on GitHub", which ends the triage session — you are now in
 * another tab reading a file instead of working a board. Eight lines either
 * side is usually enough to tell a note from a landmine.
 *
 * Fetched on demand rather than stored: file contents are large, they go stale
 * on every push, and most rows are never opened.
 */
export async function codeContext(todoId: string): Promise<CodeContext> {
  const { installationIds } = await callerContext(todoId)

  const todo = await todoForAnalysis(todoId, installationIds)
  if (!todo) throw new Error("Not found")

  const octokit = await installationClient(todo.installationId)
  const source = await fetchFile(octokit, {
    owner: todo.owner,
    repo: todo.name,
    path: todo.filePath,
    ref: todo.lastSeenSha,
  })

  if (source === null) return null

  const all = source.split(/\r?\n/)
  // `todo.line` is 1-based, as it comes from the diff and the tree walk.
  const start = Math.max(1, todo.line - CONTEXT_RADIUS)
  const end = Math.min(all.length, todo.line + CONTEXT_RADIUS)

  return { startLine: start, lines: all.slice(start - 1, end) }
}

/**
 * Marks several findings as misdetections in one go.
 *
 * Shares every guard with `dismissMany` and differs only in which columns it
 * writes — which is the whole point: these two used to be one call, and the
 * bulk bar was labelled "Not real TODOs" while recording a dismissal.
 */
export async function markManyNotTodo(todoIds: string[]): Promise<{ marked: number }> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  const ids = todoIds.filter((id) => UUID.test(id))
  if (ids.length === 0) return { marked: 0 }

  const installationIds = await accessibleInstallationIds(session.accessToken)
  const result = await markNotTodos({
    todoIds: ids,
    by: session.user?.name ?? session.user?.email ?? "unknown",
    installationIds,
  })

  if (result.repositoryId !== null) revalidate(result.repositoryId)
  return { marked: result.marked }
}

export async function postComment(todoId: string, body: string) {
  const { installationIds, who } = await callerContext(todoId)

  const added = await addComment({ todoId, body, authorLogin: who, installationIds })
  if (!added) throw new Error("Not found")

  revalidate(added.repositoryId)
}

export type DeepScanStatus = { at: string | null; found: number | null }

/**
 * The last completed deep scan for a repository.
 *
 * Polled by the button while a scan is queued. Inngest runs the job outside the
 * request, so there is no connection to hold open and nothing to push down — the
 * only honest signal available to the browser is that `deep_scan_at` has moved.
 *
 * A `Date` is serialised to a string on the way out. Comparing two ISO strings
 * from the same source is a correct ordering test and avoids re-hydrating a
 * `Date` on the client only to call `getTime()` on it.
 */
export async function deepScanStatus(repositoryId: number): Promise<DeepScanStatus> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  const installationIds = await accessibleInstallationIds(session.accessToken)
  const repo = await getRepository(repositoryId, installationIds)
  if (!repo) throw new Error("Not found")

  return {
    at: repo.deepScanAt ? repo.deepScanAt.toISOString() : null,
    found: repo.deepScanFound,
  }
}
