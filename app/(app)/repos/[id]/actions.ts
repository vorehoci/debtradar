"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  addComment,
  dismissTodos,
  getRepository,
  saveFixAnalysis,
  setManualBand,
  setValidity,
  todoForAnalysis,
} from "@/db/repository"
import { accessibleInstallationIds } from "@/lib/access"
import { parseBand } from "@/lib/describe"
import { analyseFix, fetchFile } from "@/lib/fix-analysis"
import { installationClient } from "@/lib/github"
import { deepScanRequested, inngest } from "@/lib/inngest"
import { consume } from "@/lib/rate-limit"

/** A spend guard, not a billing contract — see lib/rate-limit.ts. */
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

export type FixAnalysisResult =
  | { state: "ok" }
  | { state: "rate-limited"; resetInSeconds: number }
  | { state: "unreadable" }

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
  revalidatePath("/")
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

  const limit = consume(`analyse:${todo.installationId}`, ANALYSES_PER_HOUR, HOUR_MS)
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

  const analysis = await analyseFix({
    comment: todo.text,
    marker: todo.marker,
    context: { path: todo.filePath, line: todo.line, source },
  })

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

  const limit = consume(`deep-scan:${repo.installationId}`, DEEP_SCANS_PER_DAY, DAY_MS)
  if (!limit.allowed) {
    return { state: "rate-limited", resetInSeconds: limit.resetInSeconds }
  }

  const octokit = await installationClient(repo.installationId)
  const { data: ref } = await octokit.rest.git.getRef({
    owner: repo.owner,
    repo: repo.name,
    ref: `heads/${repo.defaultBranch}`,
  })

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

export async function postComment(todoId: string, body: string) {
  const { installationIds, who } = await callerContext(todoId)

  const added = await addComment({ todoId, body, authorLogin: who, installationIds })
  if (!added) throw new Error("Not found")

  revalidate(added.repositoryId)
}
