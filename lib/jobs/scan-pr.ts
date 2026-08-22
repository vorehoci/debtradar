import { installationClient } from "@/lib/github"
import { inngest, scanRequested } from "@/lib/inngest"
import { scanFiles, scanFilesRemoved } from "@/lib/todos"

/**
 * PR-time feedback only — regex markers, no classifier and no writes.
 *
 * `synchronize` fires on every push to an open PR, so running the LLM here
 * would bill for branches that may never merge. Unmarked comments get judged
 * once the code reaches the default branch, where the result is durable.
 */
export const scanPullRequest = inngest.createFunction(
  {
    id: "scan-pull-request",
    triggers: [scanRequested],
    // Pushing to an open PR re-fires the webhook; keying on the head commit
    // means the same tree is never scanned twice.
    idempotency: "event.data.headSha",
    retries: 2,
  },
  async ({ event, step }) => {
    const { installationId, owner, repo, pullNumber, title } = event.data

    const files = await step.run("fetch-diff", async () => {
      const octokit = await installationClient(installationId)
      return octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      })
    })

    const added = scanFiles(files).filter((c) => c.marker)
    const removed = scanFilesRemoved(files).filter((c) => c.marker)

    console.log(`\nPR #${pullNumber} "${title}" in ${owner}/${repo}`)
    console.log(`  adds ${added.length} TODO(s), resolves ${removed.length}`)
    for (const c of added) {
      console.log(`  + [${c.marker}] ${c.file}:${c.line}  ${c.text}`)
    }
    for (const c of removed) {
      console.log(`  - [${c.marker}] ${c.file}:${c.line}  ${c.text}`)
    }

    return { added: added.length, resolved: removed.length }
  },
)
