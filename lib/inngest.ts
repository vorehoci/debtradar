import { Inngest, eventType } from "inngest"
import { z } from "zod"

export const inngest = new Inngest({ id: "debtradar" })

/**
 * Emitted when a PR needs scanning. Doubles as the function's trigger and as
 * the factory for sending one, so the shape is declared exactly once.
 */
export const scanRequested = eventType("pr/scan.requested", {
  schema: z.object({
    installationId: z.number(),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number(),
    /** Head commit of the PR — also the idempotency key for the scan. */
    headSha: z.string(),
    title: z.string(),
  }),
})
