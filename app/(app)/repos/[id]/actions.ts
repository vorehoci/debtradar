"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  addComment,
  saveFixAnalysis,
  setManualBand,
  todoForAnalysis,
} from "@/db/repository"
import { accessibleInstallationIds } from "@/lib/access"
import { parseBand } from "@/lib/describe"
import { analyseFix, fetchFile } from "@/lib/fix-analysis"
import { installationClient } from "@/lib/github"
import { consume } from "@/lib/rate-limit"

/** A spend guard, not a billing contract — see lib/rate-limit.ts. */
const ANALYSES_PER_HOUR = 60
const HOUR_MS = 60 * 60 * 1000

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

export async function postComment(todoId: string, body: string) {
  const { installationIds, who } = await callerContext(todoId)

  const added = await addComment({ todoId, body, authorLogin: who, installationIds })
  if (!added) throw new Error("Not found")

  revalidate(added.repositoryId)
}
