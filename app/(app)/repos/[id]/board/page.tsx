import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ORPHAN_FILTER_DAYS, rankedTodos, type Source, todoCounts } from "@/db/ranking"
import { commentsForRepository } from "@/db/repository"
import { type Band, BANDS } from "@/lib/describe"
import { currentRepositories } from "@/lib/session-repos"
import { PAGE_SIZE } from "@/lib/paging"
import { Legend } from "../legend"
import { Board } from "./board-client"
import { TodoList } from "./list-client"
import { SearchBox } from "./search-box"

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

/**
 * The first page of each column.
 *
 * Deep enough to be useful, shallow enough that a column stays scannable — the
 * rest is now reachable through "Load more" rather than being announced by a
 * "+442 more" line and left there.
 */
const PER_COLUMN = PAGE_SIZE

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
  /**
   * Board unless asked otherwise.
   *
   * A URL parameter rather than component state so the choice survives a
   * reload, is linkable, and is carried by every filter link below — the same
   * reason `source`, `dismissed` and `q` live here.
   */
  const listView = search.view === "list"
  /**
   * The product thesis, finally given a control.
   *
   * Author inactivity is a fifth of the score and the thing the whole ranking
   * argues for — a note nobody can explain any more — and until now the only
   * way to act on it was to open rows one at a time and read the panel.
   */
  const orphaned = search.orphaned === "1"
  const source: Source | undefined = search.source === "claude" ? "claude" : undefined
  const query = typeof search.q === "string" ? search.q.trim() : ""

  /**
   * Builds a board URL from both toggles at once.
   *
   * Each link previously wrote only its own parameter, so turning one on
   * silently switched the other off — the kind of thing that reads as the page
   * ignoring your click.
   */
  const boardHref = (next: {
    source?: Source
    dismissed?: boolean
    view?: boolean
    orphaned?: boolean
  }) => {
    const params = new URLSearchParams()
    if (next.source) params.set("source", next.source)
    if (next.dismissed) params.set("dismissed", "1")
    // Carried for the same reason the two toggles carry each other: a chip that
    // silently cleared the search would read as the board ignoring the click.
    if (query) params.set("q", query)
    if (next.view ?? listView) params.set("view", "list")
    if (next.orphaned ?? orphaned) params.set("orphaned", "1")
    const qs = params.toString()
    return `/repos/${repositoryId}/board${qs ? `?${qs}` : ""}`
  }

  // The list is already scoped to this user's installations, so finding the
  // repository in it *is* the access check — and it costs no extra query,
  // because the sidebar has already loaded the same list this render.
  const repo = session.repos.find((candidate) => candidate.id === repositoryId)
  if (!repo) notFound()

  // Everything in one wave, comments included — nothing here depends on
  // another's result, so a filter click costs one round trip rather than two.
  const [counts, comments, ...lists] = await Promise.all([
    todoCounts(repositoryId, source, query),
    commentsForRepository(repositoryId),
    ...COLUMNS.map((band) =>
      rankedTodos(repositoryId, {
        bands: [band],
        source,
        search: query,
        orphaned,
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
    <main className="w-full px-4 py-6 sm:px-6 sm:py-10">
      {/* Stacked until `md:`. Side by side it was a row that could not wrap with
          a `shrink-0` right half, so on a narrow window the title and chips were
          squeezed into a sliver while search and the legend kept their full
          width — and a long `owner/name` pushed the whole header off screen. */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            <span className="text-muted">{repo.owner}/</span>
            {repo.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span>
              {query
                ? `${counts.open} matching “${query}”`
                : `${counts.open} open · worst first in each column`}
            </span>

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
                    : "border-edge-strong hover:border-edge-strong"
                }`}
              >
                Found by Claude{source === "claude" ? "" : ` (${counts.byClaude})`}
              </Link>
            ) : null}

            {/* Amber rather than violet: this chip selects on risk, where the
                Claude chip selects on provenance. Two filters in the same colour
                would read as two halves of one control. */}
            {counts.orphaned > 0 || orphaned ? (
              <Link
                href={boardHref({ source, dismissed: showDismissed, orphaned: !orphaned })}
                aria-pressed={orphaned}
                title={`Author inactive for over ${ORPHAN_FILTER_DAYS} days`}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  orphaned
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-edge-strong hover:border-edge-strong"
                }`}
              >
                Author gone{orphaned ? "" : ` (${counts.orphaned})`}
              </Link>
            ) : null}

            {/* Dismissed rows are hidden, never deleted, so there has to be a way
                back to them — otherwise a mis-click is permanent. */}
            {counts.dismissed > 0 ? (
              <Link
                href={boardHref({ source, dismissed: !showDismissed })}
                className="text-xs underline-offset-2 hover:underline"
              >
                {showDismissed ? "hide dismissed" : `show ${counts.dismissed} dismissed`}
              </Link>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:shrink-0">
          <SearchBox initial={query} />

          <Legend />
        </div>
      </header>

      {/* Both views read the same per-band pages the server already fetched;
          only the presentation differs, so switching costs no extra query. */}
      {listView ? (
        <TodoList
          columns={columns}
          repo={repo}
          comments={comments}
          repositoryId={repositoryId}
          source={source}
          search={query}
          includeDismissed={showDismissed}
          orphaned={orphaned}
        />
      ) : (
        <Board
          columns={columns}
          counts={counts}
          repo={repo}
          comments={comments}
          repositoryId={repositoryId}
          source={source}
          search={query}
          includeDismissed={showDismissed}
          orphaned={orphaned}
        />
      )}
    </main>
  )
}
