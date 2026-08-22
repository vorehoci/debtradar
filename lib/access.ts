import { Octokit } from "octokit"

/**
 * The installations this user can see, according to GitHub.
 *
 * Authorisation is deliberately delegated rather than mirrored: GitHub already
 * knows who administers which account, and a permissions table of our own would
 * drift the moment someone joins or leaves an organisation.
 */
export async function accessibleInstallationIds(accessToken: string): Promise<number[]> {
  const octokit = new Octokit({ auth: accessToken })
  const installations = await octokit.paginate("GET /user/installations", { per_page: 100 })
  return installations.map((installation) => installation.id)
}
