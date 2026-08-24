/**
 * Marks a card someone answered "not a real TODO".
 *
 * Extracted so the card and the legend render the same element — a legend that
 * reimplements what it documents drifts the first time either changes.
 */
export function DismissedChip({ by }: { by?: string | null }) {
  return (
    <span
      title={by ? `Marked not a real TODO by ${by}` : undefined}
      className="rounded bg-neutral-200 px-1 text-[9px] font-medium uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
    >
      dismissed
    </span>
  )
}
