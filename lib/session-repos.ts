import { cache } from "react"
import { auth } from "@/auth"
import { listRepositories } from "@/db/repository"
import { accessibleInstallationIds, GitHubAuthError } from "./access"

export interface SessionUser {
  name: string
  image: string | null
}

export type SessionRepos =
  | { state: "signed-out" }
  | { state: "expired" }
  | {
      state: "ok"
      user: SessionUser
      repos: Awaited<ReturnType<typeof listRepositories>>
    }

/**
 * The repositories this session may see, resolved once per request.
 *
 * `cache` deduplicates across the layout and the page: the sidebar needs the
 * list to show a repository's name, and both pages need it too, but a single
 * render must not run the query three times.
 */
export const currentRepositories = cache(async (): Promise<SessionRepos> => {
  const session = await auth()
  if (!session?.accessToken) return { state: "signed-out" }

  try {
    const installationIds = await accessibleInstallationIds(session.accessToken)
    return {
      state: "ok",
      // Carried here rather than fetched again in the header: this function is
      // already the one place that reads the session, and it is request-cached.
      user: {
        name: session.user?.name ?? session.user?.email ?? "Signed in",
        image: session.user?.image ?? null,
      },
      repos: await listRepositories(installationIds),
    }
  } catch (error) {
    // A GitHub App user token expires after eight hours; that is an ordinary
    // state to render, not a crash.
    if (error instanceof GitHubAuthError) return { state: "expired" }
    throw error
  }
})
