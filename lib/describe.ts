/** Weights sum to 1, so the score lands in 0–100. */
export const WEIGHTS = {
  age: 0.3,
  churn: 0.25,
  orphan: 0.2,
  severity: 0.25,
} as const

export type Band = "critical" | "high" | "moderate" | "low"

/** Worst first, which is also the order columns appear in. */
export const BANDS: Band[] = ["critical", "high", "moderate", "low"]

/**
 * Parses a band from untrusted input — a form value or a Server Action
 * argument. Anything unrecognised means "back to automatic", so a bad value
 * clears an override rather than being rejected or, worse, trusted.
 */
export function parseBand(raw: unknown): Band | null {
  return typeof raw === "string" && (BANDS as string[]).includes(raw) ? (raw as Band) : null
}

/**
 * Bands exist because a bare score reads as a grade — "22/100" looks like a
 * failing mark when it actually means "nothing here is urgent yet". A label
 * makes the same number a judgement rather than a report card.
 */
export const BAND_THRESHOLDS = { critical: 70, high: 50, moderate: 30 } as const

export function bandFor(score: number): Band {
  if (score >= BAND_THRESHOLDS.critical) return "critical"
  if (score >= BAND_THRESHOLDS.high) return "high"
  if (score >= BAND_THRESHOLDS.moderate) return "moderate"
  return "low"
}

const DAY = 86_400_000

/** Prose duration — "3 days", "8 months", "10 years". */
export function duration(from: Date): string {
  const days = Math.max(0, Math.round((Date.now() - from.getTime()) / DAY))
  if (days < 1) return "today"
  if (days === 1) return "1 day"
  if (days < 45) return `${days} days`

  const months = Math.round(days / 30)
  if (days < 365) return months === 1 ? "1 month" : `${months} months`

  const years = Math.round(days / 365)
  return years === 1 ? "1 year" : `${years} years`
}

export function describeAge(authoredAt: Date | null): string {
  return authoredAt ? `${duration(authoredAt)} old` : "age unknown"
}

/**
 * A file nobody touches is a file nobody trips over, so low churn is stated as
 * a mitigating fact rather than a small number.
 */
export function describeChurn(churn: number | null): string {
  if (churn === null) return "churn unknown"
  if (churn <= 1) return "quiet file"
  return `changed ${churn}×/year`
}

/** Recent enough that the author is presumably still reachable. */
const ACTIVE_WITHIN_DAYS = 30

export function describeAuthor(login: string | null, lastActive: Date | null): string {
  if (!login) return "author unknown"
  if (!lastActive) return `${login}, activity unknown`

  const days = (Date.now() - lastActive.getTime()) / DAY
  if (days <= ACTIVE_WITHIN_DAYS) return `${login} is still active`
  return `${login} hasn't committed in ${duration(lastActive)}`
}

/**
 * The one-line explanation shown in place of a score.
 *
 * This sentence is the product: a flat TODO list cannot say "the author left".
 * Hiding it behind a number would hide the only thing that distinguishes this
 * from grep.
 */
export function describeRisk(todo: {
  authoredAt: Date | null
  fileChurn: number | null
  authorLogin: string | null
  authorLastActiveAt: Date | null
}): string {
  return [
    describeAge(todo.authoredAt),
    describeChurn(todo.fileChurn),
    describeAuthor(todo.authorLogin, todo.authorLastActiveAt),
  ].join(" · ")
}

export interface Contribution {
  label: string
  /** The concrete fact behind the number — "changed 31×/year", not "0.75". */
  detail: string
  /** Points this factor added to the score. */
  points: number
  /** Points it could have added at most, i.e. its weight. */
  max: number
}

/** Short enough to sit in a table cell, unlike describeAuthor's full sentence. */
function orphanDetail(login: string | null, lastActive: Date | null): string {
  if (!login) return "author unknown"
  if (!lastActive) return "activity unknown"
  const days = (Date.now() - lastActive.getTime()) / DAY
  return days <= ACTIVE_WITHIN_DAYS ? "author still active" : `author gone ${duration(lastActive)}`
}

/**
 * Breaks a score into what each factor contributed.
 *
 * A bare normalised factor ("age 0.33") is unreadable without knowing the cap
 * behind it. Pairing the underlying fact with points-out-of-possible answers
 * both questions a developer actually has: what is this measuring, and how much
 * did it matter here.
 */
export function explainScore(todo: {
  authoredAt: Date | null
  fileChurn: number | null
  authorLogin: string | null
  authorLastActiveAt: Date | null
  marker: string | null
  category: string | null
  ageFactor: number
  churnFactor: number
  orphanFactor: number
  severityFactor: number
}): Contribution[] {
  const of = (weight: number, factor: number) => ({
    points: Math.round(weight * factor * 100),
    max: Math.round(weight * 100),
  })

  return [
    { label: "age", detail: describeAge(todo.authoredAt), ...of(WEIGHTS.age, todo.ageFactor) },
    {
      label: "churn",
      detail: describeChurn(todo.fileChurn),
      ...of(WEIGHTS.churn, todo.churnFactor),
    },
    {
      label: "author",
      detail: orphanDetail(todo.authorLogin, todo.authorLastActiveAt),
      ...of(WEIGHTS.orphan, todo.orphanFactor),
    },
    {
      label: "marker",
      detail: todo.marker ?? todo.category ?? "unmarked",
      ...of(WEIGHTS.severity, todo.severityFactor),
    },
  ]
}

/** Repo-level line: "397 open · 38 critical · 112 high" or "10 open · nothing urgent". */
export function describeRepo(counts: { open: number; critical: number; high: number }): string {
  if (counts.open === 0) return "nothing outstanding"

  const parts = [`${counts.open} open`]
  if (counts.critical > 0) parts.push(`${counts.critical} critical`)
  if (counts.high > 0) parts.push(`${counts.high} high`)
  if (parts.length === 1) parts.push("nothing urgent")
  return parts.join(" · ")
}
