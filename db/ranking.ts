import { and, asc, desc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm"
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

/**
 * How a TODO was found.
 *
 * `category` is set only by the classifier — the regex pass records a `marker`
 * instead — so its presence is the record of provenance.
 */
export type Source = "claude" | "marker"

function sourceFilter(source: Source | undefined): SQL | undefined {
  if (source === "claude") return isNotNull(todos.category)
  if (source === "marker") return isNull(todos.category)
  return undefined
}

/**
 * Free-text match over the comment and its path.
 *
 * Both, not just the text: "auth" is as likely to mean "the auth module" as a
 * word in the note, and a person searching a board does not want to think about
 * which field they are searching.
 *
 * Escaped for LIKE — an underscore in a file path is otherwise a wildcard, so
 * `board_client` would match `board-client` and every other single character.
 */
function searchFilter(search: string | undefined): SQL | undefined {
  const term = search?.trim()
  if (!term) return undefined

  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  return or(ilike(todos.text, pattern), ilike(todos.filePath, pattern))
}

/**
 * How long an author must have been silent to count as gone, for filtering.
 *
 * Not `ORPHAN_CAP_DAYS`. That is a scoring ceiling — the point where the
 * orphan factor saturates at 1.0 — and using it here would surface only the
 * fully saturated rows, which is a much smaller and later set than "nobody
 * has touched this in half a year". Six months is a review cycle: long enough
 * that the person has plainly moved on, short enough to catch it while the
 * context still exists somewhere.
 */
export const ORPHAN_FILTER_DAYS = 180

/**
 * TODOs whose author has gone quiet.
 *
 * Bots and unknown authors are excluded rather than included. They score 0.5 —
 * neutral — precisely because their silence says nothing, and a filter whose
 * whole promise is "there is nobody left to ask" must not answer with rows
 * where there was never anybody to ask in the first place.
 */
function orphanFilter(orphaned: boolean | undefined): SQL | undefined {
  if (!orphaned) return undefined

  return sql`
    ${todos.authorLogin} is not null
    and ${todos.authorLogin} !~* ${BOT_PATTERN}
    and ${todos.authorLastActiveAt} is not null
    and ${todos.authorLastActiveAt} < now() - make_interval(days => ${ORPHAN_FILTER_DAYS})`
}

export interface TodoQuery {
  bands?: Band[]
  source?: Source
  /** Free text matched against the comment and the file path. */
  search?: string
  limit?: number
  /** Rows to skip, for loading a column beyond its first page. */
  offset?: number
  /**
   * Include rows a person marked "not a real TODO".
   *
   * Dismissing has to remove something from the board or it achieves nothing,
   * but the row is never deleted — a wrong answer must be reversible, and the
   * label is the point of collecting it.
   */
  includeDismissed?: boolean
  /** Only TODOs whose author has been inactive for `ORPHAN_FILTER_DAYS`. */
  orphaned?: boolean
}

/**
 * Open TODOs for a repository, worst first.
 *
 * The score is computed per query rather than stored: age and author inactivity
 * both grow with wall-clock time, so any persisted value would be wrong by
 * tomorrow. The components come back alongside it so the UI can show why a row
 * ranks where it does — an unexplained ranking is one nobody trusts.
 */
/**
 * Rows still on the board.
 *
 * Two independent ways to be off it, and they mean different things: somebody
 * dismissed it, or somebody said we misread the comment. Either hides the row;
 * only the second is training signal.
 */
const notDismissed = and(
  isNull(todos.dismissedAt),
  or(isNull(todos.isValid), eq(todos.isValid, true)),
)

export async function rankedTodos(repositoryId: number, query: TodoQuery = {}) {
  const {
    bands = [],
    source,
    search,
    limit = 25,
    offset = 0,
    includeDismissed = false,
    orphaned = false,
  } = query

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
      isValid: todos.isValid,
      validBy: todos.validBy,
      validAt: todos.validAt,
      dismissedAt: todos.dismissedAt,
      dismissedBy: todos.dismissedBy,
      band: effectiveBand,
      fixable: todos.fixable,
      fixScope: todos.fixScope,
      fixSummary: todos.fixSummary,
      fixConfidence: todos.fixConfidence,
      fixAnalyzedSha: todos.fixAnalyzedSha,
      // Compared against fixAnalyzedSha so the panel can tell a current verdict
      // from one made against code that has since changed.
      lastSeenSha: todos.lastSeenSha,
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
        sourceFilter(source),
        searchFilter(search),
        orphanFilter(orphaned),
        includeDismissed ? undefined : notDismissed,
      ),
    )
    // Ties broken by id, because scores collide often — a column of 300 rows
    // has long runs of the same integer, and without a deterministic second key
    // Postgres may order them differently between the first page and the next,
    // which shows up as rows repeating or vanishing when you load more.
    .orderBy(desc(scoreExpression), asc(todos.id))
    .limit(limit)
    .offset(offset)
}

export type RankedTodo = Awaited<ReturnType<typeof rankedTodos>>[number]

/**
 * Totals for the whole repository, not the page.
 *
 * The header previously counted the rows it had fetched, so a repository with
 * 357 open TODOs reported "50 open" — the page limit presented as a fact about
 * the codebase.
 */
export async function todoCounts(repositoryId: number, source?: Source, search?: string) {
  // Band counts exclude dismissed rows so the column headers agree with the
  // cards under them; `dismissed` is counted separately so the board can offer
  // to show them without the numbers double-counting.
  const band = (b: Band) =>
    sql<number>`count(*) filter (
      where ${effectiveBand} = ${b}
        and ${todos.dismissedAt} is null
        and (${todos.isValid} is null or ${todos.isValid} = true)
    )::int`

  const [row] = await db
    .select({
      open: sql<number>`count(*) filter (
        where ${todos.dismissedAt} is null
          and (${todos.isValid} is null or ${todos.isValid} = true)
      )::int`,
      critical: band("critical"),
      high: band("high"),
      moderate: band("moderate"),
      low: band("low"),
      dismissed: sql<number>`count(*) filter (
        where ${todos.dismissedAt} is not null or ${todos.isValid} = false
      )::int`,
      /** Total found by the classifier, so the filter chip can show its size. */
      byClaude: sql<number>`count(*) filter (
        where ${todos.category} is not null
          and ${todos.dismissedAt} is null
          and (${todos.isValid} is null or ${todos.isValid} = true)
      )::int`,
      /** Same, for the orphan chip. Must use the same rule as `orphanFilter`. */
      orphaned: sql<number>`count(*) filter (
        where ${todos.authorLogin} is not null
          and ${todos.authorLogin} !~* ${BOT_PATTERN}
          and ${todos.authorLastActiveAt} is not null
          and ${todos.authorLastActiveAt} < now() - make_interval(days => ${ORPHAN_FILTER_DAYS})
          and ${todos.dismissedAt} is null
          and (${todos.isValid} is null or ${todos.isValid} = true)
      )::int`,
    })
    .from(todos)
    // The counts must obey the same source filter as the cards, or a column
    // header claims 95 while showing three.
    .where(
      and(
        eq(todos.repositoryId, repositoryId),
        isNull(todos.resolvedAt),
        sourceFilter(source),
        searchFilter(search),
      ),
    )

  return (
    row ?? {
      open: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      dismissed: 0,
      byClaude: 0,
      orphaned: 0,
    }
  )
}

export type TodoCounts = Awaited<ReturnType<typeof todoCounts>>

/** Overview figures that are not per-band counts. */
export async function repositoryStats(repositoryId: number) {
  const [row] = await db
    .select({
      resolved: sql<number>`count(*) filter (where ${todos.resolvedAt} is not null)::int`,
      marked: sql<number>`count(*) filter (
        where ${todos.resolvedAt} is null and ${todos.marker} is not null
      )::int`,
      classified: sql<number>`count(*) filter (
        where ${todos.resolvedAt} is null and ${todos.marker} is null
      )::int`,
      manual: sql<number>`count(*) filter (
        where ${todos.resolvedAt} is null and ${todos.manualBand} is not null
      )::int`,
      // Authored, not first-seen: the age of the comment, not of our record.
      oldest: sql<string | null>`min(${todos.authoredAt}) filter (
        where ${todos.resolvedAt} is null
      )`,
      authors: sql<number>`count(distinct ${todos.authorLogin}) filter (
        where ${todos.resolvedAt} is null
      )::int`,
    })
    .from(todos)
    .where(eq(todos.repositoryId, repositoryId))

  if (!row) {
    return { resolved: 0, marked: 0, classified: 0, manual: 0, oldest: null, authors: 0 }
  }

  // A raw SQL fragment skips Drizzle's column decoding, so this arrives as a
  // timestamp string however it is annotated. Converting here keeps the lie out
  // of every caller.
  return { ...row, oldest: row.oldest === null ? null : new Date(row.oldest) }
}
