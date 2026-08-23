import { Octokit } from "octokit"

/** Raised when GitHub rejects the stored token — the session must be renewed. */
export class GitHubAuthError extends Error {}

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 401
  )
}

/**
 * The installations this user can see, according to GitHub.
 *
 * Authorisation is deliberately delegated rather than mirrored: GitHub already
 * knows who administers which account, and a permissions table of our own would
 * drift the moment someone joins or leaves an organisation.
 *
 * A 401 here is routine, not exceptional — GitHub App user tokens expire after
 * eight hours when token expiry is enabled — so it is converted into a typed
 * error the pages can turn into a sign-in prompt.
 */
export async function accessibleInstallationIds(accessToken: string): Promise<number[]> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const installations = await octokit.paginate("GET /user/installations", { per_page: 100 })
    return installations.map((installation) => installation.id)
  } catch (error) {
    if (isUnauthorized(error)) {
      throw new GitHubAuthError("GitHub rejected the stored access token")
    }
    throw error
  }
}
