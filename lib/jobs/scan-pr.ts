import { classifyUnmarked } from "@/lib/classify"
import { installationClient } from "@/lib/github"
import { inngest, scanRequested } from "@/lib/inngest"
import { scanFiles } from "@/lib/todos"

export const scanPullRequest = inngest.createFunction(
  {
    id: "scan-pull-request",
    triggers: [scanRequested],
    // Pushing to an open PR re-fires the webhook; keying on the head commit
    // means the same tree is never scanned (or billed) twice.
    idempotency: "event.data.headSha",
    retries: 2,
  },
  async ({ event, step }) => {
    const { installationId, owner, repo, pullNumber, title } = event.data

    // Each step is checkpointed: if classification fails and retries, the diff
    // is replayed from cache rather than refetched from GitHub.
    const files = await step.run("fetch-diff", async () => {
      const octokit = await installationClient(installationId)
      return octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      })
    })

    const candidates = scanFiles(files)
    const marked = candidates.filter((c) => c.marker)
    const unmarked = candidates.filter((c) => !c.marker)

    const verdicts = await step.run("classify-unmarked", () =>
      classifyUnmarked(unmarked, files),
    )

    console.log(`\nPR #${pullNumber} "${title}" in ${owner}/${repo}`)
    console.log(`  ${files.length} file(s), ${marked.length} marked, ${unmarked.length} unmarked`)
    for (const c of marked) {
      console.log(`  [${c.marker}] ${c.file}:${c.line}  ${c.text}`)
    }
    for (const v of verdicts) {
      const c = unmarked[v.index]
      console.log(
        `  [${v.category}] ${c.file}:${c.line}  ${c.text}` +
          `  (${v.confidence.toFixed(2)} — ${v.reason})`,
      )
    }

    return {
      files: files.length,
      marked: marked.length,
      unmarked: unmarked.length,
      actionable: verdicts.length,
    }
  },
)
