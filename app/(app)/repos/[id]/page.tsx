import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { repositoryStats, todoCounts } from "@/db/ranking"
import { getRepository } from "@/db/repository"
import { accessibleInstallationIds, GitHubAuthError } from "@/lib/access"
import { describeRepo, duration } from "@/lib/describe"
import { formatDate } from "@/lib/format"
import { BandChart } from "./band-chart"
import { DeepScanButton } from "./deep-scan-button"

export const dynamic = "force-dynamic"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-neutral-400">{hint}</p> : null}
    </div>
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
          <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {describeRepo(counts)}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={String(counts.open)} />
        <Stat label="Resolved" value={String(stats.resolved)} hint="since debtradar started" />
        <Stat
          label="Oldest"
          value={stats.oldest ? duration(stats.oldest) : "—"}
          hint={stats.oldest ? formatDate(stats.oldest) : "not enriched yet"}
        />
        <Stat
          label="Contributors"
          value={String(stats.authors)}
          hint="with an open TODO"
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">By severity</h2>
        <BandChart counts={counts} />
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium">How they were found</h2>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Marked (TODO, FIXME…)</dt>
              <dd className="tabular-nums">{stats.marked}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Found by Claude</dt>
              <dd className="tabular-nums">{stats.classified}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Severity set by hand</dt>
              <dd className="tabular-nums">{stats.manual}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-medium">Unmarked comments</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Regular scans only catch comments carrying a marker. This reads the rest and
              keeps the ones that describe real work.
            </p>
            {repo.deepScanAt ? (
              <p className="mt-2 text-[11px] text-neutral-400">
                Last run {formatDate(repo.deepScanAt)} — found {repo.deepScanFound ?? 0}.
              </p>
            ) : null}
          </div>
          <div className="mt-3">
            <DeepScanButton repositoryId={repositoryId} />
          </div>
        </div>
      </section>

      <Link
        href={`/repos/${repositoryId}/board`}
        className="inline-block rounded border border-neutral-300 px-3 py-2 text-xs hover:border-neutral-500 dark:border-neutral-700"
      >
        Open the board →
      </Link>
    </main>
  )
}
