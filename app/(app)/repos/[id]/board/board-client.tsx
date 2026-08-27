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
import { PAGE_SIZE } from "@/lib/paging"
import type { RankedTodo } from "@/db/ranking"
import { MAX_COMMENT_LENGTH, type TodoCommentRow } from "@/lib/todo-comments"
import {
  analyseTodo,
  type CodeContext,
  codeContext,
  dismissMany,
  markManyNotTodo,
  loadMoreTodos,
  postComment,
  restoreTodo,
  updateSeverity,
  updateValidity,
} from "../actions"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { useDraggableCard, useDropColumn } from "./use-drag"
import { Marks } from "../marks"

export type Repo = { owner: string; name: string; defaultBranch: string }

const COLUMN_ACCENT: Record<Band, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  moderate: "bg-[#6c8579]",
  low: "bg-[#2e4a3c]",
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
        className={`absolute top-2 right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-panel transition-opacity  ${
          checked
            ? "border-mint opacity-100"
            : `border-edge-strong  ${
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
            ? "border-mint ring-1 ring-mint"
            : selected
              ? "border-mint"
              : "border-edge hover:border-edge-strong"
        } ${
          // Only visible when "show dismissed" is on, and then it must be obvious
          // which rows are only there because you asked to see them.
          todo.isValid === false ? "opacity-50" : ""
        } bg-panel`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-subtle">
            {todo.marker ?? todo.category}
          </span>
          {/* No space reserved for the checkbox: it only appears on hover or
              while selecting, and covering the score then is fine — nobody is
              reading it at that moment. */}
          <span className="flex items-center gap-1.5">
            <Marks todo={todo} />
            <span className="text-[11px] tabular-nums text-faint">{todo.score}</span>
          </span>
        </div>

        <p className="mt-1 truncate font-mono text-xs text-muted">
          {filename}:{todo.line}
        </p>
        <p className="mt-2 line-clamp-3 text-xs text-subtle">{todo.text}</p>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-faint">
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

/** Drops ids from every paged-in column, leaving untouched bands as they were. */
function prune(
  pages: Partial<Record<Band, RankedTodo[]>>,
  ids: Set<string>,
): Partial<Record<Band, RankedTodo[]>> {
  const next: Partial<Record<Band, RankedTodo[]>> = {}
  for (const band of BANDS) {
    const rows = pages[band]
    if (rows) next[band] = rows.filter((todo) => !ids.has(todo.id))
  }
  return next
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
        <p className="text-xs text-faint">No comments yet.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded border border-edge p-2">
              <p className="text-xs whitespace-pre-wrap text-subtle">{comment.body}</p>
              <p className="mt-1 text-[11px] text-faint">
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
          className="w-full rounded border border-edge-strong bg-transparent p-2 text-xs disabled:opacity-50"
        />
        {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="mt-1 rounded bg-mint px-3 py-1.5 text-xs font-medium text-surface disabled:opacity-40"
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
    <section className="mt-6 border-t border-edge pt-4">
      {analysed ? (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                todo.fixable ? "bg-violet-950 text-violet-300" : "bg-edge text-subtle"
              }`}
            >
              {todo.fixable ? "Actionable" : "Not actionable"}
            </span>
            {todo.fixScope ? <span className="text-[11px] text-faint">{todo.fixScope}</span> : null}
            {todo.fixConfidence !== null ? (
              <span className="text-[11px] tabular-nums text-faint">
                {todo.fixConfidence.toFixed(2)}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-subtle">{todo.fixSummary}</p>

          {stale ? (
            <p className="mt-1 text-[11px] text-amber-500">
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
        <p className="text-[11px] text-faint">Analysed against the current version of this file.</p>
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
/**
 * One way off the board, with a reason attached.
 *
 * This was two controls — "Is this a real TODO? yes/no" and a Dismiss button —
 * and they were indistinguishable in use: both hid the row, and the difference
 * between them lived entirely in what the label would be worth later. So people
 * used whichever was nearer, and the column meant to record "we misread this"
 * filled up with "I do not care about this" instead.
 *
 * One button now, then a reason. Same single decision for the person, still two
 * separate facts in the database — only one of which is evidence about
 * detection quality.
 *
 * The old explicit "yes, this is real" is gone. It was clicked twice in the
 * life of the feature, and dismissing with "I do not need it" already says it:
 * somebody read the finding, accepted it was real, and chose not to act.
 */
function HideRow({ todo, onDone }: { todo: RankedTodo; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [choosing, setChoosing] = useState(false)

  const dismissed = todo.dismissedAt !== null
  const misdetected = todo.isValid === false
  const hidden = dismissed || misdetected

  function hide(reason: "dont-need" | "not-a-todo") {
    startTransition(async () => {
      if (reason === "not-a-todo") await updateValidity(todo.id, "no")
      else await dismissMany([todo.id])
      // The row leaves the board, so the panel showing it closes with it rather
      // than lingering over something no longer there.
      onDone()
    })
  }

  function restore() {
    startTransition(async () => {
      // Both can be set — dismissed first, then corrected — so both are undone.
      if (misdetected) await updateValidity(todo.id, "unset")
      if (dismissed) await restoreTodo(todo.id)
      onDone()
    })
  }

  if (hidden) {
    const by = misdetected ? todo.validBy : todo.dismissedBy
    const at = misdetected ? todo.validAt : todo.dismissedAt

    return (
      <section className="mt-6 border-t border-edge pt-4">
        <p className="mb-2 text-[11px] text-faint">
          {misdetected ? "Marked not a real TODO" : "Hidden"} by {by ?? "someone"}
          {at ? ` on ${formatDate(at)}` : ""}.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={restore}
          className="w-full cursor-pointer rounded border border-edge-strong px-3 py-2 text-xs transition-colors hover:border-edge-strong disabled:opacity-50"
        >
          {pending ? "Restoring…" : "Put back on the board"}
        </button>
      </section>
    )
  }

  return (
    <section className="mt-6 border-t border-edge pt-4">
      {choosing ? (
        <>
          <h3 className="mb-2 text-xs font-medium">Why?</h3>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => hide("dont-need")}
              className="cursor-pointer rounded border border-edge-strong px-3 py-2 text-left text-xs transition-colors hover:border-edge-strong disabled:opacity-50"
            >
              <span className="font-medium">I do not need it</span>
              <span className="block text-[11px] text-faint">
                A real TODO you have decided not to act on.
              </span>
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => hide("not-a-todo")}
              className="cursor-pointer rounded border border-edge-strong px-3 py-2 text-left text-xs transition-colors hover:border-edge-strong disabled:opacity-50"
            >
              <span className="font-medium">It is not a TODO</span>
              <span className="block text-[11px] text-faint">
                We misread the comment. Kept as feedback on detection.
              </span>
            </button>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => setChoosing(false)}
            className="mt-2 cursor-pointer text-[11px] text-faint hover:text-subtle disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="w-full cursor-pointer rounded border border-edge-strong px-3 py-2 text-xs transition-colors hover:border-edge-strong"
        >
          Hide from board
        </button>
      )}
    </section>
  )
}

/**
 * The lines around the finding, fetched when asked for.
 *
 * Collapsed by default and loaded on click rather than with the panel: it is a
 * GitHub round trip per row, and most rows are opened to read the comment and
 * closed again. Someone who wants the code asks for it once.
 */
function CodeView({ todo }: { todo: RankedTodo }) {
  const [context, setContext] = useState<CodeContext>(null)
  const [state, setState] = useState<"idle" | "loading" | "empty" | "shown">("idle")

  // Keyed on the row, so opening a second finding does not show the first
  // one's code while its own request is still in flight.
  const [lastId, setLastId] = useState(todo.id)
  if (todo.id !== lastId) {
    setLastId(todo.id)
    setContext(null)
    setState("idle")
  }

  async function load() {
    setState("loading")
    try {
      const result = await codeContext(todo.id)
      setContext(result)
      setState(result ? "shown" : "empty")
    } catch {
      setState("empty")
    }
  }

  return (
    <section className="mt-6 border-t border-edge pt-4">
      {state === "shown" && context ? (
        <pre className="overflow-x-auto rounded bg-raised p-3 text-[11px] leading-[1.6]">
          <code>
            {context.lines.map((line, index) => {
              const number = context.startLine + index
              const isTodo = number === todo.line
              return (
                <div key={number} className={isTodo ? "-mx-3 bg-amber-950/40 px-3" : undefined}>
                  <span className="mr-3 inline-block w-8 text-right text-faint select-none">
                    {number}
                  </span>
                  {line || " "}
                </div>
              )
            })}
          </code>
        </pre>
      ) : (
        <button
          type="button"
          onClick={load}
          disabled={state === "loading"}
          className="w-full cursor-pointer rounded border border-edge-strong px-3 py-2 text-xs transition-colors hover:border-edge-strong disabled:opacity-50"
        >
          {state === "loading"
            ? "Loading…"
            : state === "empty"
              ? "That file could not be read"
              : "Show surrounding code"}
        </button>
      )}
    </section>
  )
}

/** Exported so the list view opens the same detail panel rather than a copy. */
export function Panel({
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
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-sm animate-slide-in-right flex-col overflow-y-auto border-l border-edge bg-panel p-5 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-mono text-sm font-semibold">{todo.marker ?? todo.category}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-faint hover:text-ink"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <p className="font-mono text-xs break-all text-muted">
        {todo.filePath}:{todo.line}
      </p>

      <p className="mt-4 rounded bg-raised p-3 font-mono text-xs break-words">{todo.text}</p>

      <p className="mt-4 text-xs text-subtle">{describeRisk(todo)}</p>

      <CodeView todo={todo} />

      <HideRow todo={todo} onDone={onClose} />

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
          className="mt-1 w-full rounded border border-edge-strong bg-transparent px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="auto" className="bg-panel">
            Automatic ({todo.band})
          </option>
          {BANDS.map((band) => (
            <option key={band} value={band} className="bg-panel capitalize">
              {band}
            </option>
          ))}
        </select>
      </label>

      {todo.manualBand ? (
        <p className="mt-2 text-[11px] text-faint">
          Set by {todo.manualBandBy ?? "someone"}
          {todo.manualBandAt ? ` on ${formatDate(todo.manualBandAt)}` : ""}. Choose Automatic to
          return it to the computed band.
        </p>
      ) : null}

      <div className="mt-6">
        <h3 className="mb-2 text-xs font-medium">Why this score</h3>
        <table className="w-full">
          <tbody>
            {explainScore(todo).map((c) => (
              <tr key={c.label} className="text-muted">
                <td className="py-0.5 pr-2 text-[11px] uppercase text-faint">{c.label}</td>
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
        className="mt-6 rounded border border-edge-strong px-3 py-1.5 text-center text-xs hover:border-edge-strong"
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
  repositoryId,
  source,
  search,
  includeDismissed,
  orphaned,
}: {
  columns: { band: Band; total: number; todos: RankedTodo[] }[]
  counts: Record<Band, number>
  repo: Repo
  comments: TodoCommentRow[]
  repositoryId: number
  source?: "claude"
  search: string
  includeDismissed: boolean
  orphaned: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  /** Pages fetched after the first, per band. */
  const [extra, setExtra] = useState<Partial<Record<Band, RankedTodo[]>>>({})
  // A set rather than one band: the columns page independently, and a single
  // slot would let a finished fetch clear another column's spinner.
  const [loading, setLoading] = useState<Set<Band>>(new Set())

  // Changing a filter changes what the pages mean, so anything already paged in
  // is now answering the previous question. Adjusting during render rather than
  // in an effect avoids a frame where the old rows are shown under the new
  // filter — see React's "storing information from previous renders".
  const filters = `${source ?? ""}|${search}|${includeDismissed}|${orphaned}`
  const [lastFilters, setLastFilters] = useState(filters)
  if (filters !== lastFilters) {
    setLastFilters(filters)
    setExtra({})
    setChecked(new Set())
  }

  /**
   * Server pages plus anything loaded since, with duplicates dropped.
   *
   * A revalidation re-renders the first page from scratch, and a row that moved
   * up can land in both halves; React would then render two cards with the same
   * key and lose one of them.
   */
  const merged = columns.map((column) => {
    const more = extra[column.band]
    if (!more?.length) return column

    const seen = new Set(column.todos.map((todo) => todo.id))
    return {
      ...column,
      todos: [...column.todos, ...more.filter((todo) => !seen.has(todo.id))],
    }
  })

  function setBusy(band: Band, busy: boolean) {
    setLoading((current) => {
      const next = new Set(current)
      if (busy) next.add(band)
      else next.delete(band)
      return next
    })
  }

  async function loadMore(band: Band, offset: number) {
    if (loading.has(band)) return
    setBusy(band, true)
    try {
      const rows = await loadMoreTodos({
        repositoryId,
        band,
        offset,
        source,
        search,
        includeDismissed,
        orphaned,
      })
      setExtra((current) => ({ ...current, [band]: [...(current[band] ?? []), ...rows] }))
    } finally {
      setBusy(band, false)
    }
  }

  /**
   * Applies a change the instant it happens, before the server confirms.
   *
   * Without this a dropped card snaps back to its old column and jumps again on
   * revalidation, which reads as the action having failed. React discards this
   * state automatically once the action settles and fresh props arrive.
   */
  const [view, apply] = useOptimistic(
    merged,
    (
      current,
      action:
        { type: "move"; todoId: string; toBand: Band } | { type: "dismiss"; ids: Set<string> },
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

  /**
   * Takes the selection off the board, recording why.
   *
   * Both reasons hide the same rows and look identical here; only the columns
   * written differ. The bar used to offer one button labelled "Not real TODOs"
   * that called the dismiss path, so it claimed to be recording a misdetection
   * while recording a triage decision — the exact confusion the two columns
   * were split to end.
   */
  function hideChecked(reason: "dismiss" | "not-a-todo") {
    const ids = new Set(checked)
    setChecked(new Set())
    // The panel may be showing one of the rows about to disappear.
    if (selectedId && ids.has(selectedId)) setSelectedId(null)
    // The optimistic update only covers the render; these rows are ours to keep
    // and would come back when the server revalidation replaces the first page.
    setExtra((current) => prune(current, ids))

    startTransition(async () => {
      apply({ type: "dismiss", ids })
      if (reason === "not-a-todo") await markManyNotTodo([...ids])
      else await dismissMany([...ids])
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

          // Dropped out of the page it was paged into: it belongs to another
          // column now, and the server will place it there by score.
          setExtra((current) => prune(current, new Set([todoId])))

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
          <div className="flex items-center gap-4 rounded-full border border-edge-strong bg-panel px-4 py-2 shadow-lg">
            <span className="text-xs tabular-nums text-subtle">{checked.size} selected</span>
            {/* Dismiss leads because it is the ordinary case. "Not TODOs" is the
                rarer, higher-consequence one — it writes a training label — so it
                is the quieter control rather than the default. */}
            <button
              type="button"
              onClick={() => hideChecked("dismiss")}
              className="cursor-pointer rounded bg-mint px-3 py-1 text-xs font-medium text-surface"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => hideChecked("not-a-todo")}
              title="Record these as things debtradar should not have surfaced"
              className="cursor-pointer rounded border border-edge-strong px-3 py-1 text-xs text-subtle transition-colors hover:border-amber-600 hover:text-amber-500"
            >
              Not TODOs
            </button>
            <button
              type="button"
              onClick={() => setChecked(new Set())}
              className="cursor-pointer text-xs text-muted hover:text-ink"
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
              <p className="rounded-lg border border-dashed border-edge-strong p-6 text-center text-xs text-faint">
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
            {/* Was a "+ 442 more" caption, which stated the problem and left it
                there. The count stays in the label so the button also says how
                much is behind it. */}
            {total > todos.length ? (
              <button
                type="button"
                disabled={loading.has(band)}
                onClick={() => loadMore(band, todos.length)}
                className="mt-1 cursor-pointer rounded-lg border border-dashed border-edge-strong py-2 text-[11px] text-muted transition-colors hover:border-edge-strong hover:text-ink disabled:cursor-default disabled:opacity-50"
              >
                {loading.has(band)
                  ? "Loading…"
                  : `Load ${Math.min(PAGE_SIZE, total - todos.length)} more of ${total - todos.length}`}
              </button>
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
        over ? "bg-raised" : ""
      }`}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[band]}`} />
        <h2 className="text-sm font-medium capitalize">{band}</h2>
        <span className="text-xs tabular-nums text-faint">{count}</span>
      </header>

      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
