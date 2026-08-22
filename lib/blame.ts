import type { Octokit } from "octokit"

export interface BlameEntry {
  authorLogin: string | null
  authoredSha: string
  authoredAt: Date
}

/**
 * GitHub exposes blame only through GraphQL — there is no REST equivalent.
 * Ranges come back as line spans rather than per-line entries.
 */
const BLAME_QUERY = `
  query ($owner: String!, $repo: String!, $ref: String!, $path: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: $ref) {
        ... on Commit {
          blame(path: $path) {
            ranges {
              startingLine
              endingLine
              commit {
                oid
                committedDate
                author { user { login } }
              }
            }
          }
        }
      }
    }
  }
`

interface BlameResponse {
  repository: {
    object: {
      blame?: {
        ranges: {
          startingLine: number
          endingLine: number
          commit: {
            oid: string
            committedDate: string
            author: { user: { login: string } | null } | null
          }
        }[]
      }
    } | null
  }
}

/**
 * Blames one file, returning a lookup from line number to its last-touching
 * commit.
 *
 * One call covers the whole file, so callers should blame per file and reuse
 * the result across every TODO in it rather than calling per line.
 */
export async function blameFile(
  octokit: Octokit,
  params: { owner: string; repo: string; ref: string; path: string },
): Promise<Map<number, BlameEntry>> {
  const result = await octokit.graphql<BlameResponse>(BLAME_QUERY, params)
  const ranges = result.repository?.object?.blame?.ranges ?? []

  const byLine = new Map<number, BlameEntry>()
  for (const range of ranges) {
    const entry: BlameEntry = {
      authorLogin: range.commit.author?.user?.login ?? null,
      authoredSha: range.commit.oid,
      authoredAt: new Date(range.commit.committedDate),
    }
    for (let line = range.startingLine; line <= range.endingLine; line++) {
      byLine.set(line, entry)
    }
  }
  return byLine
}

/** Commits touching a path in the last year — a proxy for how hot the file is. */
export async function fileChurn(
  octokit: Octokit,
  params: { owner: string; repo: string; path: string },
): Promise<number> {
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)

  const { data } = await octokit.rest.repos.listCommits({
    ...params,
    since: since.toISOString(),
    // Capped deliberately: the difference between 100 and 400 commits does not
    // change the ranking, and paginating further costs real time.
    per_page: 100,
  })
  return data.length
}

/** When this author last committed to this repo. Null if they never have. */
export async function authorLastActive(
  octokit: Octokit,
  params: { owner: string; repo: string; author: string },
): Promise<Date | null> {
  const { data } = await octokit.rest.repos.listCommits({ ...params, per_page: 1 })
  const date = data[0]?.commit.author?.date
  return date ? new Date(date) : null
}
