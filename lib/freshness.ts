import { installationClient } from "@/lib/github"

export type Freshness =
  /** No default-branch scan has ever been recorded. */
  | { state: "never" }
  /** The scanned commit is the branch head. */
  | { state: "current"; at: Date }
  /** The branch has moved on by this many commits. */
  | { state: "behind"; at: Date; commits: number }
  /**
   * The scanned commit is no longer reachable — a force push, a rebase, or a
   * squash merge that rewrote it away.
   */
  | { state: "rewritten"; at: Date }
  /** GitHub could not be asked. Deliberately distinct from "current". */
  | { state: "unknown"; at: Date | null }

export interface ScannedRepository {
  installationId: number
  owner: string
  name: string
  defaultBranch: string
  lastScanSha: string | null
  lastScanAt: Date | null
}

/**
 * How far the default branch has moved since debtradar last read it.
 *
 * One API call, on a page that renders one repository. This deliberately does
 * not exist on the dashboard: the same answer for twenty repositories is twenty
 * calls against a 5,000/hour installation budget, on a page whose job is
 * ranking rather than diagnostics.
 *
 * The point is to give a manual rescan something to be *about*. A refresh
 * control with nothing visibly stale beside it is a button nobody has a reason
 * to press; a count of unread commits is a reason.
 *
 * Every failure resolves to `unknown` rather than to `current`. Reporting a
 * repository as up to date because GitHub timed out would be the one lie this
 * whole feature exists to prevent.
 */
export async function scanFreshness(repo: ScannedRepository): Promise<Freshness> {
  if (!repo.lastScanSha || !repo.lastScanAt) return { state: "never" }
  const at = repo.lastScanAt

  try {
    const octokit = await installationClient(repo.installationId)

    // `compare` rather than reading the ref and diffing strings: the same call
    // answers both "has it moved?" and "by how much?", and a bare inequality
    // cannot tell one commit behind from four hundred.
    const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: repo.owner,
      repo: repo.name,
      basehead: `${repo.lastScanSha}...${repo.defaultBranch}`,
    })

    if (data.ahead_by === 0) return { state: "current", at }
    return { state: "behind", at, commits: data.ahead_by }
  } catch (error) {
    // 404 here means the base commit is gone, not that the repository is —
    // getRepository already proved the caller may see it. A rewritten history
    // is the ordinary cause, and it is worth saying so, because the count a
    // comparison would have produced is meaningless in that case.
    if (typeof error === "object" && error !== null && "status" in error) {
      const { status } = error as { status: unknown }
      if (status === 404 || status === 422) return { state: "rewritten", at }
    }
    return { state: "unknown", at }
  }
}
