"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { listRepositories } from "@/db/repository"
import { accessibleInstallationIds } from "@/lib/access"
import { installationClient } from "@/lib/github"
import { inngest, seedRequested } from "@/lib/inngest"
import { consume } from "@/db/rate-limit"

/**
 * Seeding is normally a webhook's job, so this is a recovery path.
 *
 * Three an hour per installation. A seed walks a whole repository tarball and
 * runs the regex pass — no model calls, so this is a bandwidth and time guard
 * rather than a spend one, and the limit can be loose. What it actually stops
 * is somebody holding the button down while fifty tarballs are in flight.
 */
const SEEDS_PER_HOUR = 3
const HOUR_MS = 60 * 60 * 1000

export type SeedResult =
  | { state: "queued"; repositories: number }
  /** Installed, but the installation exposes no repositories to select. */
  | { state: "empty" }
  /** No installations at all — the caller should be sent to install the app. */
  | { state: "not-installed" }
  | { state: "rate-limited"; resetInSeconds: number }

/**
 * Asks GitHub what this user's installations can see and queues a seed for each.
 *
 * This exists because the two events that seed a repository — `installation
 * .created` and `installation_repositories.added` — fire exactly once and are
 * never replayed. Miss one, for any reason (the app cold at the wrong moment, a
 * deploy mid-flight, GitHub exhausting its retries), and the account is stuck:
 * installed, empty, and looking at a dashboard that says to wait for a scan
 * that will never be queued. Recovering from that used to mean uninstalling and
 * reinstalling the app, which is a lot to ask of somebody in their first five
 * minutes.
 *
 * GitHub is asked rather than the database read, deliberately. The database is
 * the thing that is missing rows — that is the whole problem — so the only
 * trustworthy answer to "which repositories should exist?" comes from the side
 * that still knows.
 */
export async function seedMyRepositories(): Promise<SeedResult> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not signed in")

  const installationIds = await accessibleInstallationIds(session.accessToken)
  if (installationIds.length === 0) return { state: "not-installed" }

  // Checked for every installation before anything is queued, so the button
  // either seeds all of them or none — a partial run would report success while
  // leaving half the account looking exactly as broken as before. The cost is
  // that a rejected call still spends a token on the installations it cleared,
  // which only matters to somebody holding administrator access to several
  // accounts at once.
  for (const installationId of installationIds) {
    const limit = await consume(`seed:${installationId}`, SEEDS_PER_HOUR, HOUR_MS)
    if (!limit.allowed) return { state: "rate-limited", resetInSeconds: limit.resetInSeconds }
  }

  let queued = 0

  for (const installationId of installationIds) {
    const octokit = await installationClient(installationId)

    // Paginated: an installation granted "All repositories" on a busy
    // organisation runs to hundreds, and the first page would silently seed a
    // subset — which looks exactly like the bug this function exists to fix.
    const repositories = await octokit.paginate("GET /installation/repositories", {
      per_page: 100,
    })

    if (repositories.length === 0) continue

    // One send per installation rather than per repository: the events are
    // small and a single batch is one round trip instead of hundreds.
    await inngest.send(
      repositories.map((repository) =>
        seedRequested.create({
          installationId,
          accountLogin: repository.owner.login,
          repositoryId: repository.id,
          owner: repository.owner.login,
          repo: repository.name,
        }),
      ),
    )

    queued += repositories.length
  }

  if (queued === 0) return { state: "empty" }

  revalidatePath("/dashboard")
  return { state: "queued", repositories: queued }
}

/**
 * How many repositories the caller can now see.
 *
 * The button polls this to know when the first seed has landed. There is no
 * per-run completion flag to watch the way the deep scan has one — a seed's
 * whole observable effect is that rows start existing.
 */
export async function seededRepositoryCount(): Promise<number> {
  const session = await auth()
  if (!session?.accessToken) return 0

  const installationIds = await accessibleInstallationIds(session.accessToken)
  return (await listRepositories(installationIds)).length
}
