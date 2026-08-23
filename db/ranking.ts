import { and, desc, eq, isNull, sql } from "drizzle-orm"
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

/** Weights sum to 1, so the score lands in 0–100. */
export const WEIGHTS = {
  age: 0.3,
  churn: 0.25,
  orphan: 0.2,
  severity: 0.25,
} as const

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

const score = sql<number>`round((
  ${WEIGHTS.age} * ${age} +
  ${WEIGHTS.churn} * ${churn} +
  ${WEIGHTS.orphan} * ${orphan} +
  ${WEIGHTS.severity} * ${severity}
)::numeric * 100)::int`

/**
 * Open TODOs for a repository, worst first.
 *
 * The score is computed per query rather than stored: age and author inactivity
 * both grow with wall-clock time, so any persisted value would be wrong by
 * tomorrow. The components come back alongside it so the UI can show why a row
 * ranks where it does — an unexplained ranking is one nobody trusts.
 */
export async function rankedTodos(repositoryId: number, limit = 50) {
  return db
    .select({
      id: todos.id,
      filePath: todos.filePath,
      line: todos.line,
      text: todos.text,
      marker: todos.marker,
      category: todos.category,
      authorLogin: todos.authorLogin,
      authoredAt: todos.authoredAt,
      fileChurn: todos.fileChurn,
      score,
      ageFactor: age,
      churnFactor: churn,
      orphanFactor: orphan,
      severityFactor: severity,
    })
    .from(todos)
    .where(and(eq(todos.repositoryId, repositoryId), isNull(todos.resolvedAt)))
    .orderBy(desc(score))
    .limit(limit)
}

export type RankedTodo = Awaited<ReturnType<typeof rankedTodos>>[number]
