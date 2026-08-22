import type { CommentCandidate } from "./todos"

export interface CheckOutput {
  title: string
  summary: string
}

/**
 * Conclusion is never `failure`.
 *
 * A check that reddens CI for adding a TODO is a check people disable, and an
 * app they uninstall. `neutral` reports without blocking; the point is to make
 * the debt visible at the moment it is cheapest to fix, not to police it.
 */
export function conclusion(added: number, resolved: number): "success" | "neutral" {
  return added === 0 || resolved >= added ? "success" : "neutral"
}

function title(added: number, resolved: number): string {
  if (added === 0 && resolved === 0) return "No TODOs added or resolved"
  if (added === 0) return `Resolves ${resolved} TODO${resolved === 1 ? "" : "s"}`
  if (resolved === 0) return `Adds ${added} TODO${added === 1 ? "" : "s"}`
  return `Adds ${added}, resolves ${resolved}`
}

function bullet(
  candidate: CommentCandidate,
  repo: { owner: string; name: string },
  sha: string,
): string {
  const url = `https://github.com/${repo.owner}/${repo.name}/blob/${sha}/${candidate.file}#L${candidate.line}`
  return `- \`${candidate.marker}\` [${candidate.file}:${candidate.line}](${url}) — ${candidate.text}`
}

export function checkOutput(params: {
  added: CommentCandidate[]
  resolved: CommentCandidate[]
  repo: { owner: string; name: string }
  sha: string
}): CheckOutput {
  const { added, resolved, repo, sha } = params
  const sections: string[] = []

  if (added.length > 0) {
    sections.push(
      `**Added**\n${added.map((c) => bullet(c, repo, sha)).join("\n")}`,
    )
  }
  if (resolved.length > 0) {
    sections.push(
      `**Resolved**\n${resolved.map((c) => bullet(c, repo, sha)).join("\n")}`,
    )
  }
  if (sections.length === 0) {
    sections.push("This pull request neither adds nor resolves any marked TODOs.")
  }

  return { title: title(added.length, resolved.length), summary: sections.join("\n\n") }
}
