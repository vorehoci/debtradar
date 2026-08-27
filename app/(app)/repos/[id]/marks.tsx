import type { RankedTodo } from "@/db/ranking"
import { AnalysedMark } from "./analysed-mark"
import { DismissedChip } from "./dismissed-chip"
import { ManualMark } from "./manual-mark"

/**
 * The cluster of marks a finding can carry.
 *
 * Shared by the board card and the list row rather than written twice. The card
 * had them inline, and when dismissal was split from validity the list would
 * have had to repeat the same four conditions — including the one the card got
 * wrong, which only checked `isValid` and so showed nothing for a row that had
 * actually been dismissed.
 *
 * Score and comment count are deliberately not here: both layouts place those
 * differently, and only these three are the same fact in the same order.
 */
export function Marks({ todo }: { todo: RankedTodo }) {
  return (
    <>
      {todo.dismissedAt ? <DismissedChip reason="dismissed" by={todo.dismissedBy} /> : null}
      {todo.isValid === false ? <DismissedChip reason="not-a-todo" by={todo.validBy} /> : null}
      {todo.fixAnalyzedSha ? (
        <AnalysedMark fixable={todo.fixable} stale={todo.fixAnalyzedSha !== todo.lastSeenSha} />
      ) : null}
      {todo.manualBand ? <ManualMark by={todo.manualBandBy} at={todo.manualBandAt} /> : null}
    </>
  )
}
