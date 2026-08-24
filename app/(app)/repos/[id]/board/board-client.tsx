"use client"

import { startTransition, useEffect, useOptimistic, useState, useTransition } from "react"
import {
  type Band,
  BANDS,
  describeAge,
  describeChurn,
  describeRisk,
  explainScore,
} from "@/lib/describe"
import { blobUrl, formatDate, formatDateTime } from "@/lib/format"
import type { RankedTodo } from "@/db/ranking"
import { MAX_COMMENT_LENGTH, type TodoCommentRow } from "@/lib/todo-comments"
import { analyseTodo, dismissMany, postComment, updateSeverity, updateValidity } from "../actions"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { AnalysedMark } from "../analysed-mark"
import { DismissedChip } from "../dismissed-chip"
import { useDraggableCard, useDropColumn } from "./use-drag"
import { ManualMark } from "../manual-mark"

type Repo = { owner: string; name: string; defaultBranch: string }

const COLUMN_ACCENT: Record<Band, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  moderate: "bg-neutral-400",
  low: "bg-neutral-300",
}

function Card({
  todo,
  commentCount,
  selected,
  onSelect,
  checked,
  onToggleChecked,
  anyChecked,
}: {
  todo: RankedTodo
  commentCount: number
  selected: boolean
  onSelect: () => void
  checked: boolean
  onToggleChecked: () => void
  anyChecked: boolean
}) {
  const filename = todo.filePath.split("/").pop() ?? todo.filePath
  const { ref, dragging } = useDraggableCard(todo.id, todo.band)

  return (
    <div ref={ref} className={`group relative ${dragging ? "opacity-40" : ""}`}>
      {/* Its own hit target, outside the card button: selecting and opening are
          different intents, and a modifier-click convention would be invisible.
          Hidden until hover unless something is already selected, so the board
          stays clean while you are only reading it. */}
      <label
        className={`absolute top-2 right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-opacity dark:bg-neutral-900 ${
          checked
            ? "border-neutral-900 opacity-100 dark:border-neutral-100"
            : `border-neutral-300 dark:border-neutral-600 ${
                anyChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleChecked}
          className="sr-only"
          aria-label={`Select ${filename}:${todo.line}`}
        />
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M6.2 11.6 2.8 8.2l1.2-1.2 2.2 2.2 5.8-5.8 1.2 1.2z" />
          </svg>
        ) : null}
      </label>

      <button
        type="button"
        // Once anything is selected the board is in selection mode, so the whole
        // card becomes the target — hunting for a 20px checkbox to pick the next
        // twenty rows is the thing that makes bulk triage tedious. Clearing the
        // selection returns clicks to opening the panel.
        onClick={anyChecked ? onToggleChecked : onSelect}
        aria-pressed={anyChecked ? checked : selected}
        // `active:` covers the press before a drag actually starts, so the hand
        // closes on mousedown rather than only once the card detaches.
        className={`w-full rounded-lg border p-3 text-left transition-colors ${
          dragging ? "cursor-grabbing" : "cursor-pointer active:cursor-grabbing"
        } ${
          checked
            ? "border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100"
            : selected
              ? "border-neutral-900 dark:border-neutral-100"
              : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
        } ${
          // Only visible when "show dismissed" is on, and then it must be obvious
          // which rows are only there because you asked to see them.
          todo.isValid === false ? "opacity-50" : ""
        } bg-white dark:bg-neutral-900`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
            {todo.marker ?? todo.category}
          </span>
          {/* No space reserved for the checkbox: it only appears on hover or
              while selecting, and covering the score then is fine — nobody is
              reading it at that moment. */}
          <span className="flex items-center gap-1.5">
            {todo.isValid === false ? <DismissedChip by={todo.validBy} /> : null}
            {todo.fixAnalyzedSha ? (
              <AnalysedMark
                fixable={todo.fixable}
                stale={todo.fixAnalyzedSha !== todo.lastSeenSha}
              />
            ) : null}
            {todo.manualBand ? <ManualMark by={todo.manualBandBy} at={todo.manualBandAt} /> : null}
            <span className="text-[11px] tabular-nums text-neutral-400">{todo.score}</span>
          </span>
        </div>

        <p className="mt-1 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {filename}:{todo.line}
        </p>
        <p className="mt-2 line-clamp-3 text-xs text-neutral-700 dark:text-neutral-300">
          {todo.text}
        </p>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          <span>
            {describeAge(todo.authoredAt)} · {describeChurn(todo.fileChurn)}
          </span>
          {/* Without this a discussion is invisible until the card is opened. */}
          {commentCount > 0 ? (
            <span title={`${commentCount} comment(s)`} className="ml-auto shrink-0">
              💬 {commentCount}
            </span>
          ) : null}
        </p>
      </button>
    </div>
  )
}

function Comments({ todoId, comments }: { todoId: string; comments: TodoCommentRow[] }) {
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-medium">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h3>

      {comments.length === 0 ? (
        <p className="text-xs text-neutral-400">No comments yet.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded border border-neutral-200 p-2 dark:border-neutral-800"
            >
              <p className="text-xs whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                {comment.body}
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                {comment.authorLogin} · {formatDateTime(comment.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          const text = body.trim()
          if (!text) return
          setError(null)
          startTransition(async () => {
            try {
              await postComment(todoId, text)
              // Cleared only on success, so a failed post does not lose what
              // the person typed.
              setBody("")
            } catch {
              setError("Could not save that comment.")
            }
          })
        }}
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          rows={3}
          placeholder="Add a note…"
          disabled={pending}
          className="w-full rounded border border-neutral-300 bg-transparent p-2 text-xs disabled:opacity-50 dark:border-neutral-700"
        />
        {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="mt-1 rounded bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Saving…" : "Comment"}
        </button>
      </form>
    </section>
  )
}

function FixAnalysis({ todo }: { todo: RankedTodo }) {
  const [pending, startTransition] = useTransition()
  const [problem, setProblem] = useState<string | null>(null)

  const analysed = todo.fixAnalyzedSha !== null
  const stale = analysed && todo.fixAnalyzedSha !== todo.lastSeenSha

  // The action returns the cached verdict unchanged when the file has not moved
  // on, so offering the button then would spend a round trip to redraw the same
  // thing — a control that appears broken because it effectively is.
  const canRun = !analysed || stale

  function run() {
    setProblem(null)
    startTransition(async () => {
      try {
        const result = await analyseTodo(todo.id)
        if (result.state === "rate-limited") {
          setProblem(
            `Analysis limit reached. Try again in about ${Math.ceil(result.resetInSeconds / 60)} minutes.`,
          )
        } else if (result.state === "unreadable") {
          setProblem("That file could not be read — it may have moved or been deleted.")
        }
      } catch {
        setProblem("The analysis failed. Try again shortly.")
      }
    })
  }

  return (
    <section className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      {analysed ? (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                todo.fixable
                  ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                  : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {todo.fixable ? "Actionable" : "Not actionable"}
            </span>
            {todo.fixScope ? (
              <span className="text-[11px] text-neutral-400">{todo.fixScope}</span>
            ) : null}
            {todo.fixConfidence !== null ? (
              <span className="text-[11px] tabular-nums text-neutral-400">
                {todo.fixConfidence.toFixed(2)}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">{todo.fixSummary}</p>

          {stale ? (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-500">
              Judged against an older commit — the file has changed since.
            </p>
          ) : null}
        </div>
      ) : null}

      {canRun ? (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="w-full rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {pending ? "Analysing…" : stale ? "Re-analyse with Claude" : "Analyse with Claude"}
        </button>
      ) : (
        <p className="text-[11px] text-neutral-400">
          Analysed against the current version of this file.
        </p>
      )}

      {problem ? <p className="mt-1 text-[11px] text-red-600">{problem}</p> : null}
    </section>
  )
}

/**
 * "Is this a real TODO?" — feedback on detection, not on importance.
 *
 * Importance is already answered by the band, so this asks the one question the
 * band cannot: should we have surfaced this at all. That is also the only
 * question whose answer is usable later as training signal.
 */
function Validity({ todo, onDismissed }: { todo: RankedTodo; onDismissed: () => void }) {
  const [pending, startTransition] = useTransition()

  function answer(value: "yes" | "no" | "unset") {
    startTransition(async () => {
      await updateValidity(todo.id, value)
      // A dismissed row leaves the board, so the panel showing it must close
      // with it rather than linger over something no longer there.
      if (value === "no") onDismissed()
    })
  }

  const current = todo.isValid === null ? "unset" : todo.isValid ? "yes" : "no"

  return (
    <section className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <h3 className="mb-2 text-xs font-medium">Is this a real TODO?</h3>

      <div className="flex gap-1.5">
        {(["yes", "no"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            onClick={() => answer(current === value ? "unset" : value)}
            aria-pressed={current === value}
            className={`flex-1 rounded border px-3 py-1.5 text-xs capitalize transition-colors disabled:opacity-50 ${
              current === value
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-neutral-400">
        {current === "unset"
          ? "“No” hides it from the board. It is kept, and you can bring it back."
          : `Answered ${current} by ${todo.validBy ?? "someone"}${
              todo.validAt ? ` on ${formatDate(todo.validAt)}` : ""
            }. Click again to undo.`}
      </p>
    </section>
  )
}

function Panel({
  todo,
  repo,
  comments,
  onClose,
}: {
  todo: RankedTodo
  repo: Repo
  comments: TodoCommentRow[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col overflow-y-auto border-l border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-mono text-sm font-semibold">{todo.marker ?? todo.category}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <p className="font-mono text-xs break-all text-neutral-500 dark:text-neutral-400">
        {todo.filePath}:{todo.line}
      </p>

      <p className="mt-4 rounded bg-neutral-100 p-3 font-mono text-xs break-words dark:bg-neutral-900">
        {todo.text}
      </p>

      <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-300">{describeRisk(todo)}</p>

      <Validity todo={todo} onDismissed={onClose} />

      <FixAnalysis todo={todo} />

      <label className="mt-6 block">
        <span className="text-xs font-medium">Severity</span>
        <select
          value={todo.manualBand ?? "auto"}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value
            startTransition(async () => {
              await updateSeverity(todo.id, value)
              onClose()
            })
          }}
          className="mt-1 w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
        >
          <option value="auto" className="bg-white dark:bg-neutral-900">
            Automatic ({todo.band})
          </option>
          {BANDS.map((band) => (
            <option key={band} value={band} className="bg-white capitalize dark:bg-neutral-900">
              {band}
            </option>
          ))}
        </select>
      </label>

      {todo.manualBand ? (
        <p className="mt-2 text-[11px] text-neutral-400">
          Set by {todo.manualBandBy ?? "someone"}
          {todo.manualBandAt ? ` on ${formatDate(todo.manualBandAt)}` : ""}.
          Choose Automatic to return it to the computed band.
        </p>
      ) : null}

      <div className="mt-6">
        <h3 className="mb-2 text-xs font-medium">Why this score</h3>
        <table className="w-full">
          <tbody>
            {explainScore(todo).map((c) => (
              <tr key={c.label} className="text-neutral-500 dark:text-neutral-400">
                <td className="py-0.5 pr-2 text-[11px] uppercase text-neutral-400">{c.label}</td>
                <td className="py-0.5 pr-2 text-xs">{c.detail}</td>
                <td className="py-0.5 text-right text-[11px] tabular-nums">
                  {c.points}/{c.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a
        href={blobUrl(repo, todo.filePath, todo.line)}
        target="_blank"
        rel="noreferrer"
        className="mt-6 rounded border border-neutral-300 px-3 py-1.5 text-center text-xs hover:border-neutral-500 dark:border-neutral-700"
      >
        Open on GitHub ↗
      </a>

      <Comments todoId={todo.id} comments={comments} />
    </aside>
  )
}

export function Board({
  columns,
  counts,
  repo,
  comments,
}: {
  columns: { band: Band; total: number; todos: RankedTodo[] }[]
  counts: Record<Band, number>
  repo: Repo
  comments: TodoCommentRow[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  /**
   * Applies a change the instant it happens, before the server confirms.
   *
   * Without this a dropped card snaps back to its old column and jumps again on
   * revalidation, which reads as the action having failed. React discards this
   * state automatically once the action settles and fresh props arrive.
   */
  const [view, apply] = useOptimistic(
    columns,
    (
      current,
      action:
        | { type: "move"; todoId: string; toBand: Band }
        | { type: "dismiss"; ids: Set<string> },
    ) => {
      if (action.type === "dismiss") {
        return current.map((column) => {
          const kept = column.todos.filter((todo) => !action.ids.has(todo.id))
          return {
            ...column,
            total: Math.max(0, column.total - (column.todos.length - kept.length)),
            todos: kept,
          }
        })
      }

      const moved = current.flatMap((c) => c.todos).find((todo) => todo.id === action.todoId)
      if (!moved) return current

      return current.map((column) => {
        if (column.band === action.toBand) {
          return {
            ...column,
            total: column.total + 1,
            todos: [{ ...moved, band: action.toBand }, ...column.todos],
          }
        }
        if (column.todos.some((todo) => todo.id === action.todoId)) {
          return {
            ...column,
            total: Math.max(0, column.total - 1),
            todos: column.todos.filter((todo) => todo.id !== action.todoId),
          }
        }
        return column
      })
    },
  )

  function toggleChecked(id: string) {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function dismissChecked() {
    const ids = new Set(checked)
    setChecked(new Set())
    // The panel may be showing one of the rows about to disappear.
    if (selectedId && ids.has(selectedId)) setSelectedId(null)

    startTransition(async () => {
      apply({ type: "dismiss", ids })
      await dismissMany([...ids])
    })
  }

  const selected = view.flatMap((c) => c.todos).find((t) => t.id === selectedId) ?? null

  const byTodo = new Map<string, TodoCommentRow[]>()
  for (const comment of comments) {
    const list = byTodo.get(comment.todoId)
    if (list) list.push(comment)
    else byTodo.set(comment.todoId, [comment])
  }

  // One monitor for the whole board rather than a handler per column: the drop
  // target carries the band it represents, so the move is read off the event.
  useEffect(
    () =>
      monitorForElements({
        onDrop({ source, location }) {
          const target = location.current.dropTargets[0]
          if (!target) return

          const todoId = source.data.todoId as string
          const toBand = target.data.band as Band
          if (source.data.fromBand === toBand) return

          startTransition(async () => {
            apply({ type: "move", todoId, toBand })
            await updateSeverity(todoId, toBand)
          })
        },
      }),
    [apply],
  )

  return (
    <>
      {/* Fixed to the bottom rather than inserted above the columns: a bar that
          appears in flow would shift the whole board the moment you tick a box,
          moving the next card out from under the cursor. */}
      {checked.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <div className="flex items-center gap-4 rounded-full border border-neutral-300 bg-white px-4 py-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
              {checked.size} selected
            </span>
            <button
              type="button"
              onClick={dismissChecked}
              className="cursor-pointer rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Not real TODOs
            </button>
            <button
              type="button"
              onClick={() => setChecked(new Set())}
              className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {view.map(({ band, total, todos }) => (
          <Column key={band} band={band} total={total} count={counts[band]}>
            {todos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
                Nothing here
              </p>
            ) : (
              todos.map((todo) => (
                <Card
                  key={todo.id}
                  todo={todo}
                  commentCount={byTodo.get(todo.id)?.length ?? 0}
                  selected={todo.id === selectedId}
                  onSelect={() => setSelectedId(todo.id)}
                  checked={checked.has(todo.id)}
                  onToggleChecked={() => toggleChecked(todo.id)}
                  anyChecked={checked.size > 0}
                />
              ))
            )}
            {total > todos.length ? (
              <p className="pt-1 text-center text-[11px] text-neutral-400">
                + {total - todos.length} more
              </p>
            ) : null}
          </Column>
        ))}
      </div>

      {selected ? (
        <Panel
          todo={selected}
          repo={repo}
          comments={byTodo.get(selected.id) ?? []}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  )
}

function Column({
  band,
  count,
  children,
}: {
  band: Band
  total: number
  count: number
  children: React.ReactNode
}) {
  const { ref, over } = useDropColumn(band)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`flex min-w-72 flex-1 flex-col rounded-lg p-1 transition-colors ${
        over ? "bg-neutral-100 dark:bg-neutral-900" : ""
      }`}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[band]}`} />
        <h2 className="text-sm font-medium capitalize">{band}</h2>
        <span className="text-xs tabular-nums text-neutral-400">{count}</span>
      </header>

      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
