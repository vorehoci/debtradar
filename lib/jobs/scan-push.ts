import { ensureRepository, type FoundTodo, recordScan } from "@/db/repository"
import { classifyUnmarked } from "@/lib/classify"
import { installationClient } from "@/lib/github"
import { inngest, pushReceived } from "@/lib/inngest"
import { scanFiles, scanFilesRemoved } from "@/lib/todos"

export const scanPush = inngest.createFunction(
  {
    id: "scan-push",
    triggers: [pushReceived],
    idempotency: "event.data.afterSha",
    retries: 2,
  },
  async ({ event, step }) => {
    const {
      installationId,
      accountLogin,
      repositoryId,
      owner,
      repo,
      defaultBranch,
      beforeSha,
      afterSha,
    } = event.data

    const files = await step.run("fetch-diff", async () => {
      const octokit = await installationClient(installationId)
      const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${beforeSha}...${afterSha}`,
      })
      return data.files ?? []
    })

    const added = scanFiles(files)
    const removed = scanFilesRemoved(files)
    const unmarked = added.filter((c) => !c.marker)

    // Unlike the PR path, this result is durable and ranked, so it earns the
    // cost of the classifier.
    const verdicts = await step.run("classify-unmarked", () =>
      classifyUnmarked(unmarked, files),
    )

    const found: FoundTodo[] = [
      ...added.filter((c) => c.marker),
      ...verdicts.map((v) => ({
        ...unmarked[v.index],
        category: v.category,
        confidence: v.confidence,
      })),
    ]

    const result = await step.run("persist", async () => {
      await ensureRepository({
        installationId,
        accountLogin,
        repositoryId,
        owner,
        name: repo,
        defaultBranch,
      })
      return recordScan({ repositoryId, sha: afterSha, found, removed })
    })

    console.log(
      `\npush ${owner}/${repo}@${afterSha.slice(0, 7)} — ` +
        `${result.seen} TODO(s) seen, ${result.resolved} resolved`,
    )

    return result
  },
)
