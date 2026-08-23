"use client"

import { useState, useTransition } from "react"
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
import { postComment, updateSeverity } from "./actions"
import { ManualMark } from "./manual-mark"

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
}: {
  todo: RankedTodo
  commentCount: number
  selected: boolean
  onSelect: () => void
}) {
  const filename = todo.filePath.split("/").pop() ?? todo.filePath

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-neutral-900 dark:border-neutral-100"
          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      } bg-white dark:bg-neutral-900`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
          {todo.marker ?? todo.category}
        </span>
        <span className="flex items-center gap-1.5">
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
  const selected = columns.flatMap((c) => c.todos).find((t) => t.id === selectedId) ?? null

  const byTodo = new Map<string, TodoCommentRow[]>()
  for (const comment of comments) {
    const list = byTodo.get(comment.todoId)
    if (list) list.push(comment)
    else byTodo.set(comment.todoId, [comment])
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ band, total, todos }) => (
          <section key={band} className="flex min-w-72 flex-1 flex-col">
            <header className="mb-3 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[band]}`} />
              <h2 className="text-sm font-medium capitalize">{band}</h2>
              <span className="text-xs tabular-nums text-neutral-400">{counts[band]}</span>
            </header>

            <div className="flex flex-col gap-2">
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
                  />
                ))
              )}
              {total > todos.length ? (
                <p className="pt-1 text-center text-[11px] text-neutral-400">
                  + {total - todos.length} more
                </p>
              ) : null}
            </div>
          </section>
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
