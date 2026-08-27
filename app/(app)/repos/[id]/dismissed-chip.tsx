/**
 * Marks a row that is off the board, and says which of the two reasons it is.
 *
 * They used to be one chip because they were one column. Now that dismissal and
 * "not a real TODO" are separate facts, showing them identically would put the
 * ambiguity straight back into the UI — and the whole point of splitting them
 * is that only one is a statement about our detection being wrong.
 *
 * Extracted so the card, the list and the legend render the same element — a
 * legend that reimplements what it documents drifts the first time either
 * changes.
 */
export function DismissedChip({
  reason = "dismissed",
  by,
}: {
  reason?: "dismissed" | "not-a-todo"
  by?: string | null
}) {
  const notATodo = reason === "not-a-todo"
  const label = notATodo ? "not a todo" : "dismissed"

  return (
    <span
      title={by ? (notATodo ? `Marked not a real TODO by ${by}` : `Dismissed by ${by}`) : undefined}
      className={`rounded px-1 text-[9px] font-medium uppercase ${
        notATodo ? "bg-amber-950 text-amber-400" : "bg-edge text-muted"
      }`}
    >
      {label}
    </span>
  )
}
