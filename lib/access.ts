import { createHash } from "node:crypto"
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
 * Process-local cache of the installations a token can see.
 *
 * This deliberately does not live in the session token: Auth.js persists token
 * changes with a Set-Cookie, and Next forbids setting cookies during a Server
 * Component render, so anything written there is silently discarded and
 * refetched on every request. Keeping it in the process avoids that entirely.
 *
 * The trade is that each server instance warms separately, and the cache is
 * lost on restart — both acceptable for an answer that changes only when
 * somebody installs or uninstalls the app.
 */
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500

const cache = new Map<string, { ids: number[]; at: number }>()

/** Tokens are secrets; the cache is keyed by a digest so it never holds one. */
function keyFor(accessToken: string): string {
  return createHash("sha256").update(accessToken).digest("hex")
}

function evictExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.at >= CACHE_TTL_MS) cache.delete(key)
  }
  // A pathological number of distinct tokens should not grow without bound.
  if (cache.size > MAX_ENTRIES) cache.clear()
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
  const key = keyFor(accessToken)
  const now = Date.now()

  const hit = cache.get(key)
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.ids

  const octokit = new Octokit({ auth: accessToken })

  try {
    const installations = await octokit.paginate("GET /user/installations", { per_page: 100 })
    const ids = installations.map((installation) => installation.id)

    evictExpired(now)
    cache.set(key, { ids, at: now })
    return ids
  } catch (error) {
    if (isUnauthorized(error)) {
      // A dead token must not keep serving cached access.
      cache.delete(key)
      throw new GitHubAuthError("GitHub rejected the stored access token")
    }
    throw error
  }
}
