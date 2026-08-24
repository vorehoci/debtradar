import { ensureRepository, type FoundTodo, recordDeepScan, recordScan } from "@/db/repository"
import { classifyRepoComments } from "@/lib/classify"
import { installationClient } from "@/lib/github"
import { deepScanRequested, enrichRequested, inngest } from "@/lib/inngest"
import { eachSourceFile } from "@/lib/tarball"
import { scanSource } from "@/lib/todos"

/**
 * Ceiling on comments sent to Claude in one deep scan.
 *
 * This is a *time* limit, not a cost one. On Haiku, returning only the hits,
 * judging cal.com's full 20,247 unmarked comments costs about a dollar — but it
 * is 500 batches, and even five-wide that is minutes of wall clock inside a
 * single job step. Four thousand keeps a run near a minute.
 *
 * Covering a large repository completely means chunking across several steps so
 * each stays short; the cap is what stands in for that until then.
 */
const MAX_COMMENTS = 4_000

export const deepScanRepository = inngest.createFunction(
  {
    id: "deep-scan-repository",
    triggers: [deepScanRequested],
    retries: 1,
    // One at a time across the whole app: this is the most expensive thing here.
    concurrency: 1,
    // A repeat request for the same commit would spend money to find the same
    // comments, so the head sha is the key.
    idempotency: "event.data.headSha",
  },
  async ({ event, step }) => {
    const { installationId, accountLogin, repositoryId, owner, repo, headSha } = event.data

    const unmarked = await step.run("collect-unmarked", async () => {
      const octokit = await installationClient(installationId)
      const collected: FoundTodo[] = []

      await eachSourceFile(octokit, { owner, repo, ref: headSha }, ({ path, source }) => {
        if (collected.length >= MAX_COMMENTS) return
        for (const comment of scanSource(path, source)) {
          // Marked TODOs are already in the database from the regular scan.
          if (comment.marker) continue
          if (collected.length >= MAX_COMMENTS) break
          collected.push(comment)
        }
      })

      return collected
    })

    const verdicts = await step.run("classify", () => classifyRepoComments(unmarked))

    const result = await step.run("persist", async () => {
      const found: FoundTodo[] = verdicts.map((verdict) => ({
        ...unmarked[verdict.index],
        category: verdict.category,
        confidence: verdict.confidence,
      }))

      await ensureRepository({
        installationId,
        accountLogin,
        repositoryId,
        owner,
        name: repo,
        defaultBranch: event.data.defaultBranch,
      })

      // No `removed`: a deep scan adds what the regex missed, and must never
      // resolve rows it simply did not look at.
      const persisted = await recordScan({ repositoryId, sha: headSha, found, removed: [] })
      await recordDeepScan(repositoryId, found.length)
      return { ...persisted, considered: unmarked.length, found: found.length }
    })

    await step.sendEvent("request-enrichment", [
      enrichRequested.create({ installationId, repositoryId, owner, repo, ref: headSha }),
    ])

    console.log(
      `\ndeep scan ${owner}/${repo} — judged ${result.considered} unmarked comment(s), ` +
        `kept ${result.found}`,
    )

    return result
  },
)
