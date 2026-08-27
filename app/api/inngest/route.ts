import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest"
import { enrichTodos } from "@/lib/jobs/enrich"
import { scanPullRequest } from "@/lib/jobs/scan-pr"
import { scanPush } from "@/lib/jobs/scan-push"
import { deepScanRepository } from "@/lib/jobs/deep-scan"
import { seedRepository } from "@/lib/jobs/seed"

/**
 * The ceiling for one step, not one run.
 *
 * Inngest invokes this endpoint once per step: the SDK replays the memoised
 * state, executes the first step it has no result for, and returns. So a deep
 * scan of forty chunks is forty separate requests here, and what has to fit in
 * this budget is the slowest single step — the tarball walk, or one chunk of
 * classification. `CHUNK_SIZE` in lib/jobs/deep-scan.ts is sized against this
 * number and the two have to move together.
 *
 * 300 is both the default and the hard ceiling on Vercel's Hobby plan under
 * fluid compute, so this is explicit rather than an increase. Pro raises the
 * maximum to 800.
 */
export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanPullRequest, scanPush, enrichTodos, seedRepository, deepScanRepository],
})
