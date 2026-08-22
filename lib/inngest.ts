import { Inngest, eventType } from "inngest"
import { z } from "zod"

export const inngest = new Inngest({ id: "debtradar" })

/**
 * Emitted when a PR needs scanning. Doubles as the function's trigger and as
 * the factory for sending one, so the shape is declared exactly once.
 */
/** Emitted on a push to a repository's default branch — the durable scan. */
export const pushReceived = eventType("push/default-branch.received", {
  schema: z.object({
    installationId: z.number(),
    accountLogin: z.string(),
    repositoryId: z.number(),
    owner: z.string(),
    repo: z.string(),
    defaultBranch: z.string(),
    beforeSha: z.string(),
    afterSha: z.string(),
  }),
})

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
