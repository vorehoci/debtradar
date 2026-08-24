import { Inngest, eventType } from "inngest"
import { z } from "zod"

export const inngest = new Inngest({ id: "debtradar" })

/**
 * Emitted when a PR needs scanning. Doubles as the function's trigger and as
 * the factory for sending one, so the shape is declared exactly once.
 */
/** Emitted when a repository is first installed, to scan its entire tree. */
export const seedRequested = eventType("repo/seed.requested", {
  schema: z.object({
    installationId: z.number(),
    accountLogin: z.string(),
    repositoryId: z.number(),
    owner: z.string(),
    repo: z.string(),
  }),
})

/** Emitted when someone asks Claude to read a repository's unmarked comments. */
export const deepScanRequested = eventType("repo/deep-scan.requested", {
  schema: z.object({
    installationId: z.number(),
    accountLogin: z.string(),
    repositoryId: z.number(),
    owner: z.string(),
    repo: z.string(),
    defaultBranch: z.string(),
    headSha: z.string(),
  }),
})

/** Emitted after a scan, to fill in blame, churn, and author activity. */
export const enrichRequested = eventType("todos/enrich.requested", {
  schema: z.object({
    installationId: z.number(),
    repositoryId: z.number(),
    owner: z.string(),
    repo: z.string(),
    /** Commit to blame against — the scan's head. */
    ref: z.string(),
  }),
})

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
