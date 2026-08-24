import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest"
import { enrichTodos } from "@/lib/jobs/enrich"
import { scanPullRequest } from "@/lib/jobs/scan-pr"
import { scanPush } from "@/lib/jobs/scan-push"
import { deepScanRepository } from "@/lib/jobs/deep-scan"
import { seedRepository } from "@/lib/jobs/seed"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanPullRequest, scanPush, enrichTodos, seedRepository, deepScanRepository],
})
