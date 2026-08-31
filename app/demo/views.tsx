"use client"

import { useState } from "react"
import type { Band } from "@/lib/describe"
import type { RankedTodo } from "@/db/ranking"
import { Board, type Repo } from "@/app/(app)/repos/[id]/board/board-client"
import { TodoList } from "@/app/(app)/repos/[id]/board/list-client"
import { ReadOnly } from "@/app/(app)/repos/[id]/board/read-only"

type Columns = { band: Band; total: number; todos: RankedTodo[] }[]

interface Props {
  columns: Columns
  counts: Record<Band, number>
  /** The same board restricted to findings only the deep scan turned up. */
  claudeColumns: Columns
  claudeCounts: Record<Band, number>
  /** Total Claude-found findings in the repository, for the chip's label. */
  claudeTotal: number
  repo: Repo
  repositoryId: number
}

/**
 * Board on wide screens, list on narrow ones, with a way to override either.
 *
 * The board is a four-column kanban at `min-w-72`, which on a 375px screen
 * shows Critical and a sliver of High — three of the four columns are off to
 * the right, and the only hint is that sliver. On the page whose whole job is a
 * first impression for advertising traffic, a visitor concluding there are
 * eight findings rather than 792 is the worst available outcome.
 *
 * The list is the better shape there for a reason beyond fitting: collapsed, it
 * opens on four bands and their counts, which is the ranking argument stated in
 * one screen. Opening `critical` then gives the cards that make it concrete.
 *
 * The default is CSS rather than JavaScript. This page is statically generated,
 * so the server has no idea how wide the visitor's screen is, and deciding
 * after hydration would either flash the wrong view or hold the page blank
 * while it worked that out. Both are rendered and one is hidden, which costs
 * some markup and no round trip.
 *
 * Reading `?view=list` from the URL, the way the private board does, is what
 * this replaces: `searchParams` would opt the page out of static rendering and
 * turn every ad click into ten database queries.
 */
export function DemoViews({
  columns,
  counts,
  claudeColumns,
  claudeCounts,
  claudeTotal,
  repo,
  repositoryId,
}: Props) {
  const [override, setOverride] = useState<"board" | "list" | null>(null)
  const [onlyClaude, setOnlyClaude] = useState(false)

  /**
   * Both sets are fetched on the server and swapped here.
   *
   * Filtering the already-loaded cards in the browser would have been less
   * code and a lie: the page holds twenty rows per band, and Claude's findings
   * are scored down by their own confidence — see `severity` in db/ranking.ts —
   * so almost all of them sit in `low`, below the cut. A chip promising 227 that
   * revealed eight is worse than no chip.
   */
  const active = onlyClaude ? claudeColumns : columns

  const shared = {
    columns: active,
    repo,
    repositoryId,
    comments: [],
    search: "",
    includeDismissed: false,
    orphaned: false,
    // Passed so both views drop any pages they had fetched when the filter
    // changes — those rows answer the previous question.
    source: onlyClaude ? ("claude" as const) : undefined,
  }

  const showBoard = override === null || override === "board"
  const showList = override === null || override === "list"

  return (
    <ReadOnly>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {claudeTotal > 0 ? (
          <button
            type="button"
            aria-pressed={onlyClaude}
            onClick={() => setOnlyClaude((on) => !on)}
            // Violet, matching the mark on the cards and the analysis controls:
            // every "this came from Claude" signal in the product is this hue.
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
              onlyClaude
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-edge-strong text-muted hover:text-ink"
            }`}
          >
            Found by Claude{onlyClaude ? "" : ` (${claudeTotal})`}
          </button>
        ) : (
          <span />
        )}

        <div
          role="group"
          aria-label="Layout"
          className="inline-flex overflow-hidden rounded-md border border-edge text-xs"
        >
          {(["list", "board"] as const).map((mode) => {
            // With no override the active one is whichever CSS is showing, and
            // that is a media query rather than a value this component holds —
            // so neither reads as pressed until somebody chooses.
            const active = override === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => setOverride(active ? null : mode)}
                className={`cursor-pointer px-3 py-1.5 capitalize transition-colors ${
                  active ? "bg-mint text-surface" : "text-muted hover:text-ink"
                }`}
              >
                {mode}
              </button>
            )
          })}
        </div>
      </div>

      {onlyClaude ? (
        <p className="mb-4 text-xs text-faint">
          Comments carrying no <code className="font-mono">TODO</code> or{" "}
          <code className="font-mono">FIXME</code> marker, which the regex pass walked straight
          past. They score lower on purpose — an author writing FIXME is firmer evidence than a
          model inferring it — so most of them land in Low.
        </p>
      ) : null}

      {/* When nothing is overridden these carry the responsive default; once a
          button is pressed only one of them is rendered at all. */}
      {showList ? (
        <div className={override === null ? "md:hidden" : undefined}>
          <TodoList {...shared} />
        </div>
      ) : null}

      {showBoard ? (
        <div className={override === null ? "hidden md:block" : undefined}>
          <Board {...shared} counts={onlyClaude ? claudeCounts : counts} />
        </div>
      ) : null}
    </ReadOnly>
  )
}
