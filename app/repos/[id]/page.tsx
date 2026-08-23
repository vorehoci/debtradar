import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { accessibleInstallationIds, GitHubAuthError } from "@/lib/access"
import { rankedTodos, type RankedTodo, todoCounts, type TodoCounts } from "@/db/ranking"
import { getRepository } from "@/db/repository"
import {
  type Band,
  bandFor,
  type Contribution,
  describeRepo,
  describeRisk,
  explainScore,
} from "@/lib/describe"
import { blobUrl } from "@/lib/format"
import { BANDS, buildQuery, parseBands, parseSort, type Sort, toggleBand } from "@/lib/query"
import { SortSelect } from "./sort-select"

export const dynamic = "force-dynamic"

const BAND_STYLE: Record<Band, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  moderate: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  low: "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500",
}

function Factor({ contribution }: { contribution: Contribution }) {
  const { label, detail, points, max } = contribution
  return (
    <tr className="text-neutral-500 dark:text-neutral-400">
      <td className="py-0.5 pr-3 text-[11px] uppercase tracking-wide text-neutral-400">{label}</td>
      <td className="py-0.5 pr-3 text-xs">{detail}</td>
      <td className="py-0.5 pr-2">
        <span className="block h-1 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <span
            className="block h-full rounded-full bg-neutral-500 dark:bg-neutral-400"
            style={{ width: `${Math.round((points / max) * 100)}%` }}
          />
        </span>
      </td>
      <td className="py-0.5 text-right text-[11px] tabular-nums">
        {points} <span className="text-neutral-400">of {max}</span>
      </td>
    </tr>
  )
}

function Row({
  todo,
  repo,
}: {
  todo: RankedTodo
  repo: { owner: string; name: string; defaultBranch: string }
}) {
  const band = bandFor(todo.score)
  const label = todo.marker ?? todo.category ?? "?"

  return (
    <li className="border-b border-neutral-200 py-5 last:border-0 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BAND_STYLE[band]}`}
        >
          {band}
        </span>
        <span className="font-mono text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {label}
        </span>
        <a
          href={blobUrl(repo, todo.filePath, todo.line)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          {todo.filePath}:{todo.line}
        </a>
      </div>

      {/* The sentence, not the score, is the answer to "why is this here?" */}
      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{describeRisk(todo)}</p>

      <p className="mt-1 font-mono text-xs break-words text-neutral-500 dark:text-neutral-400">
        {todo.text}
      </p>

      <details className="mt-2 group">
        <summary className="cursor-pointer text-[11px] text-neutral-400 marker:content-[''] hover:text-neutral-600 dark:hover:text-neutral-300">
          score {todo.score} · show breakdown
        </summary>
        <table className="mt-2">
          <tbody>
            {explainScore(todo).map((contribution) => (
              <Factor key={contribution.label} contribution={contribution} />
            ))}
          </tbody>
        </table>
      </details>
    </li>
  )
}

const LIMIT = 25

function BandChips({
  counts,
  active,
  sort,
  basePath,
}: {
  counts: TodoCounts
  active: Band[]
  sort: Sort
  basePath: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BANDS.map((band) => {
        const selected = active.includes(band)
        return (
          <Link
            key={band}
            href={`${basePath}${buildQuery({ bands: toggleBand(active, band), sort })}`}
            aria-pressed={selected}
            className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            }`}
          >
            {band} <span className="tabular-nums opacity-60">{counts[band]}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default async function RepoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.accessToken) redirect("/")

  const { id } = await params
  const repositoryId = Number(id)
  if (!Number.isFinite(repositoryId)) notFound()

  const search = await searchParams
  const bands = parseBands(search.band)
  const sort = parseSort(search.sort)
  const basePath = `/repos/${repositoryId}`

  let installationIds: number[]
  try {
    installationIds = await accessibleInstallationIds(session.accessToken)
  } catch (error) {
    if (error instanceof GitHubAuthError) redirect("/")
    throw error
  }

  // All three run together: the access check gates rendering, not querying, and
  // waiting on it first added a serial round trip to every filter click.
  const [repo, counts, todos] = await Promise.all([
    getRepository(repositoryId, installationIds),
    todoCounts(repositoryId),
    rankedTodos(repositoryId, { bands, sort, limit: LIMIT }),
  ])

  // Null covers both "does not exist" and "not yours" — deliberately
  // indistinguishable from outside, so ids are not enumerable.
  if (!repo) notFound()

  const filtered = bands.reduce((sum, band) => sum + counts[band], 0)
  const matching = bands.length > 0 ? filtered : counts.open

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          ← all repositories
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {describeRepo(counts)}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-neutral-200 py-3 dark:border-neutral-800">
        <BandChips counts={counts} active={bands} sort={sort} basePath={basePath} />
        <SortSelect
          value={sort}
          bandParam={bands.length > 0 ? BANDS.filter((b) => bands.includes(b)).join(",") : ""}
          basePath={basePath}
        />
      </div>

      {todos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {bands.length > 0 ? "Nothing matches this filter." : "Nothing outstanding."}
          </p>
        </div>
      ) : (
        <>
          <ul>
            {todos.map((todo) => (
              <Row key={todo.id} todo={todo} repo={repo} />
            ))}
          </ul>

          {/* Framed as triage, not pagination: the point of the tool is that
              you are not supposed to read all 357. */}
          {matching > todos.length ? (
            <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              Showing the {todos.length} highest-priority of {matching} matching.
            </p>
          ) : null}
        </>
      )}
    </main>
  )
}
