"use client"

import { useState } from "react"
import { loadMoreTodos } from "../actions"
import type { RankedTodo } from "@/db/ranking"
import { type Band, describeAge, describeAuthor, describeChurn } from "@/lib/describe"
import { formatDate } from "@/lib/format"
import { PAGE_SIZE } from "@/lib/paging"
import type { TodoCommentRow } from "@/lib/todo-comments"
import { Marks } from "../marks"
import { Panel, type Repo } from "./board-client"
import { useReadOnly } from "./read-only"

/**
 * The list view: one collapsible group per severity, inside a single card.
 *
 * The board shows four columns of twenty and stops. On a repository with 522
 * findings that leaves 442 unreachable, which is the reason this exists — it is
 * a way through the whole set rather than a second way to look at the top of it.
 *
 * Every group starts closed. Opening one is a deliberate act, so the first
 * screen is four counts rather than eighty rows, and somebody who only cares
 * about `critical` never renders the rest.
 *
 * Inside a band the findings are grouped again, by file. Debt clusters — a file
 * with nine critical TODOs is one decision about one file, not nine unrelated
 * rows — and reading the same path nine times down a column buries that.
 */

/** The band's colours, matching the terminal card on the landing page. */
const BAND_TONE: Record<Band, { dot: string; text: string }> = {
  critical: { dot: "bg-signal", text: "text-signal" },
  high: { dot: "bg-caution", text: "text-caution" },
  moderate: { dot: "bg-[#6c8579]", text: "text-[#8aa396]" },
  low: { dot: "bg-[#2e4a3c]", text: "text-[#6c8579]" },
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

type FileGroup = { path: string; todos: RankedTodo[]; worst: number }

/**
 * Findings bucketed by file, worst file first.
 *
 * A `Map` keeps insertion order, and the rows arrive already sorted by score,
 * so the file holding the worst finding comes out first without a second sort.
 */
function byFile(todos: RankedTodo[]): FileGroup[] {
  const buckets = new Map<string, RankedTodo[]>()

  for (const todo of todos) {
    const existing = buckets.get(todo.filePath)
    if (existing) existing.push(todo)
    else buckets.set(todo.filePath, [todo])
  }

  return [...buckets].map(([path, rows]) => ({
    path,
    todos: rows,
    worst: Math.max(...rows.map((todo) => todo.score)),
  }))
}

/** One finding, shown beneath its file. The path is on the row above it. */
function Row({
  todo,
  commentCount,
  onSelect,
}: {
  todo: RankedTodo
  commentCount: number
  onSelect: () => void
}) {
  const tone = BAND_TONE[todo.band]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full animate-rise-in cursor-pointer items-center gap-3 border-t border-[#18241e] py-2.5 pr-4 pl-11 text-left transition-colors hover:bg-white/[.02]"
    >
      <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-[#4e6459]">
        :{todo.line}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-mono text-[13px] text-[#e8f2ec]">{todo.text}</span>
        {todo.authoredAt ? (
          <span className="font-mono text-[11px] text-[#6c8579]">
            {formatDate(todo.authoredAt)}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        <Marks todo={todo} />
        {commentCount > 0 ? (
          <span title={`${commentCount} comment(s)`} className="text-[11px] text-faint">
            💬 {commentCount}
          </span>
        ) : null}
        <span className={`font-sans text-base font-bold tabular-nums ${tone.text}`}>
          {todo.score}
        </span>
      </span>
    </button>
  )
}

/**
 * A file inside a band.
 *
 * A file holding a single finding opens the panel directly rather than
 * expanding to reveal one row — the chevron's absence is what says which it
 * does, so the two behaviours never look alike.
 */
function FileRow({
  group,
  band,
  open,
  commentsByTodo,
  onToggle,
  onSelect,
}: {
  group: FileGroup
  band: Band
  open: boolean
  commentsByTodo: Map<string, number>
  onToggle: () => void
  onSelect: (id: string) => void
}) {
  const tone = BAND_TONE[band]
  const single = group.todos.length === 1

  /**
   * The marks of everything inside, while it is closed.
   *
   * Without this the icons only exist once a file is expanded, so a file
   * holding an analysed or hand-graded finding looks identical to one that has
   * never been touched — and the collapsed list is what people actually scan.
   * The worst row stands in for the group: it is the one already lending the
   * file its score, so the marks and the number describe the same finding.
   */
  const worstTodo = group.todos.reduce((a, b) => (b.score > a.score ? b : a))
  const groupComments = group.todos.reduce(
    (total, todo) => total + (commentsByTodo.get(todo.id) ?? 0),
    0,
  )

  return (
    <>
      <button
        type="button"
        onClick={single ? () => onSelect(group.todos[0].id) : onToggle}
        aria-expanded={single ? undefined : open}
        className="flex w-full cursor-pointer items-center gap-3 border-t border-[#18241e] px-4 py-3 text-left transition-colors hover:bg-white/[.02]"
      >
        <span className="w-4 shrink-0 text-[#4e6459]">
          {single ? null : <Chevron open={open} />}
        </span>

        <span className={`h-6 w-[3px] shrink-0 rounded-sm ${tone.dot}`} />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-mono text-[13px] text-[#e8f2ec]">{group.path}</span>

          {/*
            The three facts the score is built from, in descending order of how
            much they change a decision — so when the line truncates it drops
            churn first and keeps "the author is gone", which is the one thing a
            flat TODO list cannot tell you.

            They describe the worst finding, not an average of the file, because
            the score and the marks beside them already do.
          */}
          <span className="truncate font-mono text-[11px] text-[#4e6459]">
            {describeAge(worstTodo.authoredAt)}
            {" · "}
            {describeAuthor(worstTodo.authorLogin, worstTodo.authorLastActiveAt)}
            {" · "}
            {describeChurn(worstTodo.fileChurn)}
          </span>
        </span>

        {single ? null : (
          <span className="shrink-0 rounded border border-[#1e2b25] bg-[#070b09] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#6c8579]">
            {group.todos.length}
          </span>
        )}

        <span className="flex shrink-0 items-center gap-1.5">
          {open && !single ? null : <Marks todo={worstTodo} />}
          {groupComments > 0 ? (
            <span
              title={`${groupComments} comment(s) in this file`}
              className="text-[11px] text-faint"
            >
              💬 {groupComments}
            </span>
          ) : null}
          <span className={`w-8 text-right font-sans text-lg font-bold tabular-nums ${tone.text}`}>
            {group.worst}
          </span>
        </span>
      </button>

      {open && !single
        ? group.todos.map((todo) => (
            <Row
              key={todo.id}
              todo={todo}
              commentCount={commentsByTodo.get(todo.id) ?? 0}
              onSelect={() => onSelect(todo.id)}
            />
          ))
        : null}
    </>
  )
}

export function TodoList({
  columns,
  repo,
  comments,
  repositoryId,
  source,
  search,
  includeDismissed,
  orphaned,
}: {
  columns: { band: Band; total: number; todos: RankedTodo[] }[]
  repo: Repo
  comments: TodoCommentRow[]
  repositoryId: number
  source?: "claude"
  search: string
  includeDismissed: boolean
  orphaned: boolean
}) {
  const readOnly = useReadOnly()
  const [open, setOpen] = useState<Set<Band>>(new Set())
  // Keyed `band:path` rather than by path alone: the same file can hold
  // findings in two bands, and those are two independent rows.
  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [extra, setExtra] = useState<Partial<Record<Band, RankedTodo[]>>>({})
  const [loading, setLoading] = useState<Set<Band>>(new Set())

  // Same reasoning as the board: a filter change makes every page already
  // fetched an answer to the previous question, so it is dropped during render
  // rather than in an effect, which would show stale rows for one frame.
  const filters = `${source ?? ""}|${search}|${includeDismissed}|${orphaned}`
  const [lastFilters, setLastFilters] = useState(filters)
  if (filters !== lastFilters) {
    setLastFilters(filters)
    setExtra({})
    setOpenFiles(new Set())
  }

  /** Server page plus anything loaded since, with duplicates dropped. */
  const groups = columns.map((column) => {
    const more = extra[column.band]
    if (!more?.length) return column

    const seen = new Set(column.todos.map((todo) => todo.id))
    return { ...column, todos: [...column.todos, ...more.filter((t) => !seen.has(t.id))] }
  })

  const selected = groups.flatMap((group) => group.todos).find((todo) => todo.id === selectedId)

  // Counted once for the whole view rather than filtering the array per row,
  // which on a repository with hundreds of findings is a scan per row.
  const commentsByTodo = new Map<string, number>()
  for (const comment of comments) {
    commentsByTodo.set(comment.todoId, (commentsByTodo.get(comment.todoId) ?? 0) + 1)
  }

  function toggleFile(key: string) {
    setOpenFiles((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggle(band: Band) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(band)) next.delete(band)
      else next.add(band)
      return next
    })
  }

  async function loadMore(band: Band, offset: number) {
    if (loading.has(band)) return
    setLoading((current) => new Set(current).add(band))

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
      setLoading((current) => {
        const next = new Set(current)
        next.delete(band)
        return next
      })
    }
  }

  return (
    <>
      <div className="w-full max-w-[1120px] overflow-hidden rounded-[14px] border border-[#18241e] bg-[#0d1512] lg:border-[#1e2a24] lg:bg-[#0b120f] lg:shadow-[0_30px_80px_0_rgba(0,0,0,.6)]">
        {groups.map((group) => {
          const isOpen = open.has(group.band)
          const tone = BAND_TONE[group.band]
          const remaining = group.total - group.todos.length

          return (
            <section key={group.band} className="border-b border-[#18241e] last:border-b-0">
              <h2>
                <button
                  type="button"
                  onClick={() => toggle(group.band)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center gap-3 bg-[#101915] px-4 py-3 text-left transition-colors hover:bg-[#142019]"
                >
                  <span className="text-[#6c8579]">
                    <Chevron open={isOpen} />
                  </span>
                  <span className={`size-2 shrink-0 rounded-sm ${tone.dot}`} />
                  <span className="flex-1 font-mono text-[13px] text-[#e8f2ec] capitalize">
                    {group.band}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[#6c8579]">
                    {group.total}
                  </span>
                </button>
              </h2>

              {/* Rows are not rendered at all while closed, rather than hidden
                  with CSS: a repository with hundreds of findings would
                  otherwise mount every row on first paint to show nothing. */}
              {isOpen ? (
                group.total === 0 ? (
                  <p className="px-4 py-6 text-center font-mono text-xs text-[#4e6459]">
                    Nothing in this band.
                  </p>
                ) : (
                  <>
                    {byFile(group.todos).map((file) => (
                      <FileRow
                        key={file.path}
                        group={file}
                        band={group.band}
                        open={openFiles.has(`${group.band}:${file.path}`)}
                        commentsByTodo={commentsByTodo}
                        onToggle={() => toggleFile(`${group.band}:${file.path}`)}
                        onSelect={setSelectedId}
                      />
                    ))}

                    {remaining > 0 && !readOnly ? (
                      <button
                        type="button"
                        onClick={() => loadMore(group.band, group.todos.length)}
                        disabled={loading.has(group.band)}
                        className="w-full cursor-pointer border-t border-[#18241e] px-4 py-3 font-mono text-xs text-[#6c8579] transition-colors hover:text-[#e8f2ec] disabled:opacity-50"
                      >
                        {loading.has(group.band)
                          ? "Loading…"
                          : `Load ${Math.min(PAGE_SIZE, remaining)} more of ${remaining}`}
                      </button>
                    ) : null}
                  </>
                )
              ) : null}
            </section>
          )
        })}
      </div>

      {selected ? (
        <Panel
          todo={selected}
          repo={repo}
          comments={comments.filter((comment) => comment.todoId === selected.id)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  )
}
