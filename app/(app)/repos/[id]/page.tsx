import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { repositoryStats, todoCounts } from "@/db/ranking"
import { getRepository } from "@/db/repository"
import { accessibleInstallationIds, GitHubAuthError } from "@/lib/access"
import { describeRepo, duration } from "@/lib/describe"
import { formatDate } from "@/lib/format"
import { scanFreshness, type ScannedRepository } from "@/lib/freshness"
import { BandChart } from "./band-chart"
import { DeepScanButton } from "./deep-scan-button"

export const dynamic = "force-dynamic"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-edge p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-faint">{hint}</p> : null}
    </div>
  )
}

/**
 * How far the default branch has moved since the last regular scan.
 *
 * Its own component behind Suspense because it makes a GitHub call, and the
 * rest of this page is already in memory. Holding the headline, the counts and
 * the chart behind a network round trip to answer a question nobody has asked
 * yet would be a bad trade — this line arrives a moment later, in place.
 */
async function ScanFreshness({ repo }: { repo: ScannedRepository }) {
  const freshness = await scanFreshness(repo)

  if (freshness.state === "never") {
    return <Line tone="quiet">No scan recorded yet for {repo.defaultBranch}.</Line>
  }

  const scanned = `scanned ${formatDate(freshness.at ?? new Date())}`

  if (freshness.state === "current") {
    return (
      <Line tone="quiet">
        Up to date with {repo.defaultBranch} — {scanned}.
      </Line>
    )
  }

  if (freshness.state === "behind") {
    return (
      <Line tone="warn">
        {freshness.commits} {freshness.commits === 1 ? "commit" : "commits"} behind{" "}
        {repo.defaultBranch} — {scanned}. A push normally closes this on its own.
      </Line>
    )
  }

  if (freshness.state === "rewritten") {
    return (
      <Line tone="warn">
        The commit last scanned is no longer on {repo.defaultBranch} — a force push or a rebase
        since {scanned}.
      </Line>
    )
  }

  // Never reported as up to date: saying so because GitHub timed out is the one
  // mistake this line exists to prevent.
  return <Line tone="quiet">Could not reach GitHub to check freshness — {scanned}.</Line>
}

/**
 * Two tones, not three. Being up to date and being unable to check both warrant
 * the same quiet grey — neither asks anything of the reader — and only drift
 * earns colour. An earlier version separated "ok" from "muted" and then gave
 * them the same class, which is a distinction that exists only in the types.
 */
function Line({ tone, children }: { tone: "quiet" | "warn"; children: React.ReactNode }) {
  return (
    <p className={`mt-1.5 text-xs ${tone === "warn" ? "text-amber-500" : "text-faint"}`}>
      {children}
    </p>
  )
}

export default async function RepoOverview({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.accessToken) redirect("/")

  const { id } = await params
  const repositoryId = Number(id)
  if (!Number.isFinite(repositoryId)) notFound()

  let installationIds: number[]
  try {
    installationIds = await accessibleInstallationIds(session.accessToken)
  } catch (error) {
    if (error instanceof GitHubAuthError) redirect("/")
    throw error
  }

  const [repo, counts, stats] = await Promise.all([
    getRepository(repositoryId, installationIds),
    todoCounts(repositoryId),
    repositoryStats(repositoryId),
  ])

  if (!repo) notFound()

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-muted">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{describeRepo(counts)}</p>
        <Suspense fallback={<p className="mt-1.5 text-xs text-faint">Checking freshness…</p>}>
          <ScanFreshness repo={repo} />
        </Suspense>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={String(counts.open)} />
        <Stat label="Resolved" value={String(stats.resolved)} hint="since debtradar started" />
        <Stat
          label="Oldest"
          value={stats.oldest ? duration(stats.oldest) : "—"}
          hint={stats.oldest ? formatDate(stats.oldest) : "not enriched yet"}
        />
        <Stat label="Contributors" value={String(stats.authors)} hint="with an open TODO" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">By severity</h2>
        <BandChart counts={counts} />
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-edge p-4">
          <h2 className="text-sm font-medium">How they were found</h2>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">Marked (TODO, FIXME…)</dt>
              <dd className="tabular-nums">{stats.marked}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Found by Claude</dt>
              <dd className="tabular-nums">{stats.classified}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Severity set by hand</dt>
              <dd className="tabular-nums">{stats.manual}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-edge p-4">
          <div>
            <h2 className="text-sm font-medium">Unmarked comments</h2>
            <p className="mt-1 text-xs text-muted">
              Regular scans only catch comments carrying a marker. This reads the rest and keeps the
              ones that describe real work.
            </p>
            {repo.deepScanAt ? (
              <p className="mt-2 text-[11px] text-faint">
                Last run {formatDate(repo.deepScanAt)} — found {repo.deepScanFound ?? 0}.
              </p>
            ) : null}
          </div>
          <div className="mt-3">
            {/* The completed scan already on the page is the baseline the
                button polls against, so a repository scanned last week does not
                announce itself as freshly finished the moment one is queued. */}
            <DeepScanButton
              repositoryId={repositoryId}
              lastScanAt={repo.deepScanAt ? repo.deepScanAt.toISOString() : null}
            />
          </div>
        </div>
      </section>

      <Link
        href={`/repos/${repositoryId}/board`}
        className="inline-block rounded border border-edge-strong px-3 py-2 text-xs hover:border-edge-strong"
      >
        Open the board →
      </Link>
    </main>
  )
}
