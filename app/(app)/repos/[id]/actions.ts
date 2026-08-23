"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { addComment, setManualBand } from "@/db/repository"
import { accessibleInstallationIds } from "@/lib/access"
import { parseBand } from "@/lib/describe"

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

export async function postComment(todoId: string, body: string) {
  const { installationIds, who } = await callerContext(todoId)

  const added = await addComment({ todoId, body, authorLogin: who, installationIds })
  if (!added) throw new Error("Not found")

  revalidate(added.repositoryId)
}
