import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest"
import { scanPullRequest } from "@/lib/jobs/scan-pr"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanPullRequest],
})
