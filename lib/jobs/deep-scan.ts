import {
  clearDeepScanCandidates,
  deepScanCandidateSlice,
  ensureRepository,
  type FoundTodo,
  recordDeepScan,
  recordScan,
  stageDeepScanCandidates,
} from "@/db/repository"
import { classifyRepoComments } from "@/lib/classify"
import { installationClient } from "@/lib/github"
import { deepScanRequested, enrichRequested, inngest } from "@/lib/inngest"
import { eachSourceFile } from "@/lib/tarball"
import { recordScale, trackUsage } from "@/lib/usage"
import { type CommentCandidate, scanSource } from "@/lib/todos"

/**
 * Comments classified per step.
 *
 * The old ceiling was 4,000 for the whole run, which on cal.com judged a fifth
 * of the 20,247 unmarked comments and silently ignored the rest — the Claude
 * scan is the differentiator, and it was seeing a fifth of a large repository.
 * It was a *time* limit rather than a cost one: on Haiku, returning only the
 * hits, the full set costs about a dollar, but it is 500 batches, and even
 * five-wide that is minutes of wall clock inside one job step.
 *
 * Chunking is what removes the ceiling. Each step classifies at most this many
 * and Inngest checkpoints between them, so no single step runs long and a
 * failure resumes from the last completed chunk instead of restarting the run.
 *
 * The number is sized against the serverless clock, not against Claude. Inngest
 * runs one step per HTTP invocation, so a chunk has to finish inside the
 * platform's per-request budget — 300 seconds on Vercel, see `maxDuration` in
 * app/api/inngest/route.ts. At `REPO_BATCH` 40 and `CONCURRENCY` 5, 400
 * comments is ten batches in two waves; 2,000 was ten waves, which fit
 * comfortably on a long-lived local process and would have run right up
 * against the ceiling in production. Smaller chunks cost nothing but a few
 * more checkpoints.
 */
const CHUNK_SIZE = 400

/**
 * Absolute ceiling on one run.
 *
 * This used to be a data-transfer limit as much as a cost one: the collect step
 * returned every candidate as a single step output, and Inngest caps that at
 * 4 MiB — which is roughly where 20,000 comments land. Candidates now go to the
 * `deep_scan_candidates` table and steps exchange counts and offsets, so the
 * only thing left bounding a run is what it costs and how long it takes.
 */
const MAX_COMMENTS = 20_000

/** Lines in a file, for the cost-per-line figure the ledger is built to answer. */
function countLines(source: string): number {
  let lines = 1
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) lines++
  return lines
}

export const deepScanRepository = inngest.createFunction(
  {
    id: "deep-scan-repository",
    triggers: [deepScanRequested],
    retries: 1,
    // One at a time across the whole app: this is the most expensive thing here.
    concurrency: 1,
    // Deliberately not idempotent on the head sha any more.
    //
    // It was, and the dedupe happened inside Inngest: a repeat request for a
    // commit already judged was discarded before the function ran. That is the
    // right economics and the wrong place — the send succeeds either way, so the
    // browser could not tell a queued scan from a discarded one and waited for a
    // completion that never came. Worse, it deadlocked: the column that would
    // let the app detect the repeat is written by the run being discarded.
    //
    // `startDeepScan` now makes the same check against `deep_scan_sha` before
    // sending, and can say so. The daily rate limit and `concurrency: 1` still
    // bound the cost of anything that slips past it.
  },
  async ({ event, step }) => {
    const { installationId, accountLogin, repositoryId, owner, repo, headSha } = event.data

    /**
     * Walk the tree once, park what Claude has to judge, and return only how
     * much of it there is.
     *
     * The count is the whole output of this step. Everything it found lives in
     * `deep_scan_candidates` until the run ends — see the table's comment for
     * why the array cannot travel between steps.
     */
    const walk = await step.run("collect-unmarked", async () => {
      // Before staging, not after: the candidates carry a foreign key to the
      // repository row, and on a first-ever deep scan that row may not exist.
      await ensureRepository({
        installationId,
        accountLogin,
        repositoryId,
        owner,
        name: repo,
        defaultBranch: event.data.defaultBranch,
      })

      const octokit = await installationClient(installationId)
      const collected: CommentCandidate[] = []
      let lines = 0

      await eachSourceFile(octokit, { owner, repo, ref: headSha }, ({ path, source }) => {
        // Counted before the cap so the figure describes the repository rather
        // than the point the walk stopped caring.
        lines += countLines(source)
        if (collected.length >= MAX_COMMENTS) return
        for (const comment of scanSource(path, source)) {
          // Marked TODOs are already in the database from the regular scan.
          if (comment.marker) continue
          if (collected.length >= MAX_COMMENTS) break
          collected.push(comment)
        }
      })

      const staged = await stageDeepScanCandidates({
        repositoryId,
        sha: headSha,
        candidates: collected,
      })
      return { total: staged, lines }
    })

    const total = walk.total

    /**
     * Classify and persist one chunk at a time.
     *
     * Writing inside the same step that classifies is what keeps the run's state
     * small — a verdict never has to survive until a later step. It also removes
     * the index arithmetic this loop used to need: `RepoFinding.index` is
     * relative to the array handed to the classifier, and that array is now read
     * and used without ever leaving the step, so there is no offset to get
     * wrong.
     *
     * Each iteration is idempotent. `recordScan` upserts on
     * `(repository_id, fingerprint)`, so a retried chunk rewrites its own rows
     * rather than duplicating them.
     */
    let judged = 0
    let found = 0

    for (let start = 0; start < total; start += CHUNK_SIZE) {
      const part = await step.run(`classify-${start / CHUNK_SIZE}`, () =>
        // One ledger row per chunk rather than per run: a step is the unit that
        // either completes or is retried, and a retried chunk that recorded its
        // spend under the run would double-count it.
        trackUsage({ operation: "deep-scan", repositoryId, installationId }, async () => {
          const chunk = await deepScanCandidateSlice({
            repositoryId,
            sha: headSha,
            start,
            limit: CHUNK_SIZE,
          })

          // The lines belong to the whole walk, so they are attributed to the
          // first chunk only — summing them across chunks would multiply one
          // repository's size by the number of steps it took to judge it.
          recordScale({
            commentsJudged: chunk.length,
            linesScanned: start === 0 ? walk.lines : null,
          })

          const verdicts = await classifyRepoComments(chunk)
          const hits: FoundTodo[] = verdicts.map((verdict) => ({
            ...chunk[verdict.index],
            category: verdict.category,
            confidence: verdict.confidence,
          }))

          // No `removed`: a deep scan adds what the regex missed, and must never
          // resolve rows it simply did not look at.
          const persisted = await recordScan({
            repositoryId,
            sha: headSha,
            found: hits,
            removed: [],
          })

          return { ...persisted, judged: chunk.length }
        }),
      )

      judged += part.judged
      // `seen` is what recordScan upserted, which for a deep scan is exactly the
      // comments Claude kept — it never passes anything it rejected.
      found += part.seen
    }

    const result = await step.run("finish", async () => {
      await recordDeepScan(repositoryId, found, headSha)
      await clearDeepScanCandidates(repositoryId)
      return { considered: judged, found }
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
