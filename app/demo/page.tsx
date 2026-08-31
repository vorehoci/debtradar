import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ORPHAN_FILTER_DAYS, rankedTodos, todoCounts } from "@/db/ranking"
import { unscopedRepository } from "@/db/repository"
import { type Band, BANDS } from "@/lib/describe"
import { DEMO_REPOSITORY_ID, DEMO_UPSTREAM } from "@/lib/demo"
import { PAGE_SIZE } from "@/lib/paging"
import { Legend } from "@/app/(app)/repos/[id]/legend"
import { DemoViews } from "./views"
import { TrackClick } from "@/app/_landing/track-click"

/**
 * Cached rather than dynamic, unlike every other board.
 *
 * The private boards are `force-dynamic` because they render one person's data
 * behind a session. This one is the same page for everybody and is the landing
 * spot for paid traffic, so it should be served from the edge rather than
 * rebuilt per visitor. An hour is well inside how often a demo repository
 * changes.
 */
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Live demo",
  description:
    `A real debtradar board: ${DEMO_UPSTREAM.label} scanned end to end, every TODO ranked by ` +
    "age, file churn, author activity and marker severity. No sign-in required.",
  // The one page inside the app worth indexing: it is public, it is about a
  // repository people search for, and it is the only place the product can be
  // seen without an account.
  robots: { index: true, follow: true },
}

const COLUMNS: Band[] = BANDS

const ACTION =
  "inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2.5 text-sm font-medium " +
  "text-surface transition-colors hover:bg-mint/90"

export default async function Demo() {
  // The id is a constant, never a parameter — see lib/demo.ts. This read is
  // deliberately unscoped, and that constant is the only thing standing between
  // this page and any other board in the database.
  const repo = await unscopedRepository(DEMO_REPOSITORY_ID)
  if (!repo) notFound()

  /**
   * Two boards, not one.
   *
   * The "Found by Claude" chip switches between them in the browser, so both
   * have to be here. Filtering the first set client-side would have been
   * cheaper and wrong: this page holds twenty rows per band, and Claude's
   * findings are discounted by their own confidence in `severity`, so nearly
   * all of them fall below the cut. The chip would promise 227 and show eight.
   *
   * Ten queries rather than five, all of them at build time and then cached for
   * an hour — a visitor pays for none of it.
   */
  const [counts, claudeCounts, ...lists] = await Promise.all([
    todoCounts(DEMO_REPOSITORY_ID),
    todoCounts(DEMO_REPOSITORY_ID, "claude"),
    ...COLUMNS.map((band) => rankedTodos(DEMO_REPOSITORY_ID, { bands: [band], limit: PAGE_SIZE })),
    ...COLUMNS.map((band) =>
      rankedTodos(DEMO_REPOSITORY_ID, { bands: [band], source: "claude", limit: PAGE_SIZE }),
    ),
  ])

  const columns = COLUMNS.map((band, index) => ({
    band,
    total: counts[band],
    todos: lists[index],
  }))

  const claudeColumns = COLUMNS.map((band, index) => ({
    band,
    total: claudeCounts[band],
    todos: lists[COLUMNS.length + index],
  }))

  return (
    <main className="w-full px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-sm text-subtle underline-offset-4 hover:underline">
            ← debtradar
          </Link>
          <span className="rounded-full border border-mint/25 bg-mint/[.08] px-2.5 py-0.5 text-[11px] font-semibold tracking-[.14em] text-mint">
            LIVE DEMO · READ ONLY
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {counts.open} TODOs in{" "}
          <a
            href={DEMO_UPSTREAM.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-edge-strong underline-offset-4 hover:decoration-mint"
          >
            {DEMO_UPSTREAM.label}
          </a>
          , worst first
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted">
          A real scan, not a mock-up. Open any card for the four signals behind its score.
          {counts.byClaude > 0 ? (
            <>
              {" "}
              <span className="text-violet-400">{counts.byClaude}</span> of these carry no{" "}
              <code className="font-mono text-xs">TODO</code> marker at all — Claude found them by
              reading the comments.
            </>
          ) : null}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <TrackClick event="cta" placement="demo-page">
            <Link href="/" className={ACTION}>
              Scan your own repository
              <span aria-hidden="true">→</span>
            </Link>
          </TrackClick>
          <Legend />
        </div>
      </header>

      {/*
        List on phones, board on wide screens, both read-only — see views.tsx
        for why the default is CSS rather than a state flag, and read-only.tsx
        for what read-only hides.
      */}
      <DemoViews
        columns={columns}
        counts={counts}
        claudeColumns={claudeColumns}
        claudeCounts={claudeCounts}
        claudeTotal={counts.byClaude}
        repo={{ owner: repo.owner, name: repo.name, defaultBranch: repo.defaultBranch }}
        repositoryId={DEMO_REPOSITORY_ID}
      />

      <footer className="mt-10 border-t border-edge pt-6">
        <p className="text-xs text-faint">
          Scanned from a fork of {DEMO_UPSTREAM.label}, which is not affiliated with debtradar.
          Nothing here changes that repository — debtradar only ever reads it.
        </p>
        <p className="mt-3 text-sm text-muted">
          Cards showing “author gone” are the ones worth arguing about: the TODO is still there and
          nobody left can explain it. debtradar counts an author inactive after {ORPHAN_FILTER_DAYS}{" "}
          days.
        </p>
        <TrackClick event="cta" placement="demo-footer">
          <Link href="/" className={`mt-4 ${ACTION}`}>
            Run this on your own code
            <span aria-hidden="true">→</span>
          </Link>
        </TrackClick>
      </footer>
    </main>
  )
}
