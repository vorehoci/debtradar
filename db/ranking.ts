import { and, desc, eq, isNull, or, type SQL, sql } from "drizzle-orm"
import { type Band, BAND_THRESHOLDS, WEIGHTS } from "@/lib/describe"

import { db } from "./index"
import { todos } from "./schema"

/**
 * Caps turn unbounded quantities into 0–1 factors.
 *
 * Calibrated against 397 TODOs in TryGhost/Ghost (2026-08-23), where the
 * distributions were: age p25/p50/p90 = 929/1433/3394 days, churn = 1/2/14
 * commits per year, orphan = 3/45/1158 days. The original guesses of 365 and 50
 * were both wrong — age saturated above the 25th percentile, and churn scored
 * the median file at 0.04, so neither discriminated.
 */
const AGE_CAP_DAYS = 3650
const CHURN_CAP_COMMITS = 100
/**
 * A year, not six months. Verified against a second repository (cal.com,
 * median author inactive 157 days vs Ghost's 3): at 180 days cal.com's orphan
 * factor averaged 0.89 with a standard deviation of 0.10 — a near-constant
 * offset that discriminated nothing. A year halves the pinning and doubles the
 * spread there, while leaving Ghost unchanged.
 */
const ORPHAN_CAP_DAYS = 365

/** Authors that never come back but were never really here either. */
const BOT_PATTERN = "(bot|greenkeeper|renovate|dependabot)"

// WEIGHTS lives in lib/describe.ts so the UI can explain a score without
// importing this module — which would drag a database connection into pages
// and tests that only need the arithmetic.

/**
 * Every factor is cast to float8, and the score to int, because postgres.js
 * returns `numeric` as a *string* to preserve precision. Without the casts the
 * `sql<number>` annotations below would be lies TypeScript happily believes,
 * and the values would arrive as strings at runtime.
 */

/** Days old, from the true authored date — falling back to first sighting. */
const age = sql<number>`
  least(
    extract(epoch from (now() - coalesce(${todos.authoredAt}, ${todos.firstSeenAt})))
      / 86400.0 / ${AGE_CAP_DAYS},
    1.0
  )::float8`

/**
 * How hot the surrounding file is. A stale TODO in a frozen file matters less.
 *
 * The numerator is cast rather than written as `50.0`: interpolated values
 * become bind parameters, so a decimal suffix would land after the `$n`.
 */
const churn = sql<number>`(
  ln(1 + least(coalesce(${todos.fileChurn}, 0), ${CHURN_CAP_COMMITS}))
  / ln(1 + ${CHURN_CAP_COMMITS})
)::float8`

/**
 * How long since the author last touched this repo. Nobody left to ask is what
 * turns a note into debt — so an unknown author scores as fully orphaned.
 */
const orphan = sql<number>`
  case
    -- Unknown is not the same as gone. Blame cannot always map a commit to an
    -- account, and a bot's silence says nothing, so both score neutral rather
    -- than maximally orphaned — which previously put a Greenkeeper TODO first.
    when ${todos.authorLogin} is null then 0.5
    when ${todos.authorLogin} ~* ${BOT_PATTERN} then 0.5
    when ${todos.authorLastActiveAt} is null then 0.5
    else least(
      extract(epoch from (now() - ${todos.authorLastActiveAt})) / 86400.0 / ${ORPHAN_CAP_DAYS},
      1.0
    )
  end::float8`

/**
 * What the marker admits to. FIXME/HACK/BUG concede something is wrong; TODO is
 * often just a note. LLM-found comments are discounted by their own confidence.
 */
const severity = sql<number>`
  case
    when ${todos.marker} in ('FIXME', 'BUG', 'HACK', 'XXX') then 1.0
    when ${todos.marker} in ('TODO', 'OPTIMIZE', 'REFACTOR') then 0.6
    else coalesce(${todos.confidence}, 0.5) * 0.7
  end::float8`

/**
 * Exported so the repository list can count band membership without
 * reimplementing the formula — two copies would drift the first time a weight
 * changed, and the list would quietly disagree with the detail page.
 */
export const scoreExpression = sql<number>`round((
  ${WEIGHTS.age} * ${age} +
  ${WEIGHTS.churn} * ${churn} +
  ${WEIGHTS.orphan} * ${orphan} +
  ${WEIGHTS.severity} * ${severity}
)::numeric * 100)::int`

const computedBand = sql<Band>`
  case
    when ${scoreExpression} >= ${BAND_THRESHOLDS.critical} then 'critical'
    when ${scoreExpression} >= ${BAND_THRESHOLDS.high} then 'high'
    when ${scoreExpression} >= ${BAND_THRESHOLDS.moderate} then 'moderate'
    else 'low'
  end`

/**
 * The band a TODO actually sits in: a person's choice if they made one, the
 * computed band otherwise.
 *
 * Filtering and counting both go through this rather than through score ranges,
 * so an item moved to critical by hand appears in the critical column and is
 * counted there — which is the entire point of letting someone move it.
 */
export const effectiveBand = sql<Band>`coalesce(${todos.manualBand}, ${computedBand})`

function bandFilter(bands: Band[]): SQL | undefined {
  if (bands.length === 0) return undefined
  return or(...bands.map((band) => sql`${effectiveBand} = ${band}`))
}

export interface TodoQuery {
  bands?: Band[]
  limit?: number
}

/**
 * Open TODOs for a repository, worst first.
 *
 * The score is computed per query rather than stored: age and author inactivity
 * both grow with wall-clock time, so any persisted value would be wrong by
 * tomorrow. The components come back alongside it so the UI can show why a row
 * ranks where it does — an unexplained ranking is one nobody trusts.
 */
export async function rankedTodos(repositoryId: number, query: TodoQuery = {}) {
  const { bands = [], limit = 25 } = query

  return db
    .select({
      id: todos.id,
      filePath: todos.filePath,
      line: todos.line,
      text: todos.text,
      marker: todos.marker,
      category: todos.category,
      authorLogin: todos.authorLogin,
      authorLastActiveAt: todos.authorLastActiveAt,
      manualBand: todos.manualBand,
      manualBandBy: todos.manualBandBy,
      manualBandAt: todos.manualBandAt,
      band: effectiveBand,
      authoredAt: todos.authoredAt,
      fileChurn: todos.fileChurn,
      score: scoreExpression,
      ageFactor: age,
      churnFactor: churn,
      orphanFactor: orphan,
      severityFactor: severity,
    })
    .from(todos)
    .where(
      and(
        eq(todos.repositoryId, repositoryId),
        isNull(todos.resolvedAt),
        bandFilter(bands),
      ),
    )
    .orderBy(desc(scoreExpression))
    .limit(limit)
}

export type RankedTodo = Awaited<ReturnType<typeof rankedTodos>>[number]

/**
 * Totals for the whole repository, not the page.
 *
 * The header previously counted the rows it had fetched, so a repository with
 * 357 open TODOs reported "50 open" — the page limit presented as a fact about
 * the codebase.
 */
export async function todoCounts(repositoryId: number) {
  const band = (b: Band) =>
    sql<number>`count(*) filter (where ${effectiveBand} = ${b})::int`

  const [row] = await db
    .select({
      open: sql<number>`count(*)::int`,
      critical: band("critical"),
      high: band("high"),
      moderate: band("moderate"),
      low: band("low"),
    })
    .from(todos)
    .where(and(eq(todos.repositoryId, repositoryId), isNull(todos.resolvedAt)))

  return row ?? { open: 0, critical: 0, high: 0, moderate: 0, low: 0 }
}

export type TodoCounts = Awaited<ReturnType<typeof todoCounts>>
