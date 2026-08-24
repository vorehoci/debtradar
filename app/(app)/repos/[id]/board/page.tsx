import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { rankedTodos, type Source, todoCounts } from "@/db/ranking"
import { commentsForRepository } from "@/db/repository"
import { type Band, BANDS } from "@/lib/describe"
import { currentRepositories } from "@/lib/session-repos"
import { Legend } from "../legend"
import { Board } from "./board-client"

export const dynamic = "force-dynamic"

/**
 * All four bands, including low.
 *
 * Low was left out while a list view existed to reach it. Now that the board is
 * the only view, omitting a band would make those TODOs unreachable — and since
 * the severity dropdown can move an item *into* low, it would also be a
 * one-way trip with no way to undo it.
 */
const COLUMNS: Band[] = BANDS

/** Deep enough to be useful, shallow enough that a column stays scannable. */
const PER_COLUMN = 20

export default async function RepoBoard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await currentRepositories()
  if (session.state !== "ok") redirect("/")

  const { id } = await params
  const repositoryId = Number(id)
  if (!Number.isFinite(repositoryId)) notFound()

  const search = await searchParams
  const showDismissed = search.dismissed === "1"
  const source: Source | undefined = search.source === "claude" ? "claude" : undefined

  /**
   * Builds a board URL from both toggles at once.
   *
   * Each link previously wrote only its own parameter, so turning one on
   * silently switched the other off — the kind of thing that reads as the page
   * ignoring your click.
   */
  const boardHref = (next: { source?: Source; dismissed?: boolean }) => {
    const params = new URLSearchParams()
    if (next.source) params.set("source", next.source)
    if (next.dismissed) params.set("dismissed", "1")
    const query = params.toString()
    return `/repos/${repositoryId}/board${query ? `?${query}` : ""}`
  }

  // The list is already scoped to this user's installations, so finding the
  // repository in it *is* the access check — and it costs no extra query,
  // because the sidebar has already loaded the same list this render.
  const repo = session.repos.find((candidate) => candidate.id === repositoryId)
  if (!repo) notFound()

  // Everything in one wave, comments included — nothing here depends on
  // another's result, so a filter click costs one round trip rather than two.
  const [counts, comments, ...lists] = await Promise.all([
    todoCounts(repositoryId, source),
    commentsForRepository(repositoryId),
    ...COLUMNS.map((band) =>
      rankedTodos(repositoryId, {
        bands: [band],
        source,
        limit: PER_COLUMN,
        includeDismissed: showDismissed,
      }),
    ),
  ])

  const columns = COLUMNS.map((band, index) => ({
    band,
    total: counts[band],
    todos: lists[index],
  }))

  return (
    <main className="w-full px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
            {repo.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{counts.open} open · worst first in each column</span>

            {/* Prefetched by Next in production, so the swap is usually instant;
                in dev it is a live round trip and loading.tsx covers the gap. */}
            {counts.byClaude > 0 || source === "claude" ? (
              <Link
                href={boardHref({
                  source: source === "claude" ? undefined : "claude",
                  dismissed: showDismissed,
                })}
                aria-pressed={source === "claude"}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  source === "claude"
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700"
                }`}
              >
                Found by Claude{source === "claude" ? "" : ` (${counts.byClaude})`}
              </Link>
            ) : null}

            {/* Dismissed rows are hidden, never deleted, so there has to be a way
                back to them — otherwise a mis-click is permanent. */}
            {counts.dismissed > 0 ? (
              <Link
                href={boardHref({ source, dismissed: !showDismissed })}
                className="text-xs underline-offset-2 hover:underline"
              >
                {showDismissed
                  ? "hide dismissed"
                  : `show ${counts.dismissed} dismissed`}
              </Link>
            ) : null}
          </p>
        </div>

        <Legend />
      </header>

      <Board columns={columns} counts={counts} repo={repo} comments={comments} />
    </main>
  )
}
