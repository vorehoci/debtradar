import { applyEnrichment, type Enrichment, unenrichedTodos } from "@/db/repository"
import { type BlameEntry, authorLastActive, blameFile, fileChurn } from "@/lib/blame"
import { installationClient } from "@/lib/github"
import { enrichRequested, inngest } from "@/lib/inngest"

/**
 * Rows per run.
 *
 * Blame costs roughly a second per file, and Inngest invokes functions over
 * HTTP — so a large batch turns into a multi-minute request that times out,
 * rolls back, and retries forever without committing anything. Small batches
 * plus the self-requeue below trade round-trips for actually finishing.
 */
const BATCH = 25

export const enrichTodos = inngest.createFunction(
  {
    id: "enrich-todos",
    triggers: [enrichRequested],
    retries: 2,
    // Blame is the slowest call in the system; one repo at a time is plenty.
    concurrency: 2,
  },
  async ({ event, step }) => {
    const { installationId, repositoryId, owner, repo, ref } = event.data

    const pending = await step.run("load-pending", () => unenrichedTodos(repositoryId, BATCH))
    if (pending.length === 0) return { enriched: 0 }

    // Fetching and persisting live in one step on purpose: step boundaries
    // serialise to JSON, which would turn every Date into a string on the way
    // back out and silently break the timestamp columns.
    const enriched = await step.run("enrich-and-persist", async () => {
      const octokit = await installationClient(installationId)

      // One blame per file, one churn count per file, one activity lookup per
      // author — a repo with 200 TODOs in 10 files costs 10 blames, not 200.
      const blames = new Map<string, Map<number, BlameEntry>>()
      const churn = new Map<string, number>()
      const lastActive = new Map<string, Date | null>()

      const results: Enrichment[] = []

      for (const todo of pending) {
        if (!blames.has(todo.filePath)) {
          // A deleted or renamed file cannot be blamed at this ref; record an
          // empty map so the failure is cached rather than retried per TODO.
          const blame = await blameFile(octokit, {
            owner,
            repo,
            ref,
            path: todo.filePath,
          }).catch(() => new Map<number, BlameEntry>())
          blames.set(todo.filePath, blame)

          churn.set(
            todo.filePath,
            await fileChurn(octokit, { owner, repo, path: todo.filePath }).catch(() => 0),
          )
        }

        const entry = blames.get(todo.filePath)!.get(todo.line) ?? null

        if (entry?.authorLogin && !lastActive.has(entry.authorLogin)) {
          lastActive.set(
            entry.authorLogin,
            await authorLastActive(octokit, {
              owner,
              repo,
              author: entry.authorLogin,
            }).catch(() => null),
          )
        }

        results.push({
          id: todo.id,
          authorLogin: entry?.authorLogin ?? null,
          authoredSha: entry?.authoredSha ?? null,
          authoredAt: entry?.authoredAt ?? null,
          authorLastActiveAt: entry?.authorLogin
            ? (lastActive.get(entry.authorLogin) ?? null)
            : null,
          fileChurn: churn.get(todo.filePath) ?? null,
        })
      }

      await applyEnrichment(results)
      return results.length
    })

    // A seeded repository can hold thousands of rows; a full batch means there
    // are probably more, so the job re-queues itself rather than stopping short.
    if (pending.length === BATCH) {
      await step.sendEvent("continue-enrichment", [
        enrichRequested.create({ installationId, repositoryId, owner, repo, ref }),
      ])
    }

    console.log(`enriched ${enriched} TODO(s) in ${owner}/${repo}`)
    return { enriched, more: pending.length === BATCH }
  },
)
