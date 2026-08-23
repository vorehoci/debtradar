import { formatDate } from "@/lib/format"

/**
 * Marks a row whose band came from a person rather than the score.
 *
 * Deliberately not a client component: it has no interactivity, and both the
 * server-rendered list and the client-rendered board need it.
 */
export function ManualMark({ by, at }: { by: string | null; at: Date | null }) {
  const when = at ? formatDate(at) : "an unknown date"

  return (
    <span
      title={`Severity set by ${by ?? "someone"} on ${when}`}
      aria-label="Severity set manually"
      // Dark green: distinct enough from the band pills (red/amber/neutral)
      // that it reads as a separate kind of fact, not another severity signal.
      className="inline-flex items-center text-emerald-700 dark:text-emerald-500"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M11.4 1.6a1.4 1.4 0 0 1 2 2l-.8.8-2-2 .8-.8ZM9.8 3.2l2 2L5 12H3v-2l6.8-6.8Z" />
      </svg>
    </span>
  )
}
