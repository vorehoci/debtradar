import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "./index"
import { todos } from "./schema"

/**
 * Caps turn unbounded quantities into 0–1 factors. Past the cap, more is not
 * meaningfully worse: a TODO that is four years old and one that is two years
 * old are both simply ancient, and letting age run away would drown out every
 * other signal.
 */
const AGE_CAP_DAYS = 365
const CHURN_CAP_COMMITS = 50
const ORPHAN_CAP_DAYS = 180

/** Weights sum to 1, so the score lands in 0–100. */
export const WEIGHTS = {
  age: 0.35,
  churn: 0.25,
  orphan: 0.2,
  severity: 0.2,
} as const

/** Days old, from the true authored date — falling back to first sighting. */
const age = sql<number>`
  least(
    extract(epoch from (now() - coalesce(${todos.authoredAt}, ${todos.firstSeenAt})))
      / 86400.0 / ${AGE_CAP_DAYS},
    1.0
  )`

/** How hot the surrounding file is. A stale TODO in a frozen file matters less. */
const churn = sql<number>`least(coalesce(${todos.fileChurn}, 0) / ${CHURN_CAP_COMMITS}.0, 1.0)`

/**
 * How long since the author last touched this repo. Nobody left to ask is what
 * turns a note into debt — so an unknown author scores as fully orphaned.
 */
const orphan = sql<number>`
  case
    when ${todos.authorLastActiveAt} is null then 1.0
    else least(
      extract(epoch from (now() - ${todos.authorLastActiveAt})) / 86400.0 / ${ORPHAN_CAP_DAYS},
      1.0
    )
  end`

/**
 * What the marker admits to. FIXME/HACK/BUG concede something is wrong; TODO is
 * often just a note. LLM-found comments are discounted by their own confidence.
 */
const severity = sql<number>`
  case
    when ${todos.marker} in ('FIXME', 'BUG', 'HACK', 'XXX') then 1.0
    when ${todos.marker} in ('TODO', 'OPTIMIZE', 'REFACTOR') then 0.6
    else coalesce(${todos.confidence}, 0.5) * 0.7
  end`

const score = sql<number>`round((
  ${WEIGHTS.age} * ${age} +
  ${WEIGHTS.churn} * ${churn} +
  ${WEIGHTS.orphan} * ${orphan} +
  ${WEIGHTS.severity} * ${severity}
) * 100)`

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
