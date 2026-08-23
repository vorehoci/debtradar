import { notFound, redirect } from "next/navigation"
import { rankedTodos, todoCounts } from "@/db/ranking"
import { commentsFor } from "@/db/repository"
import type { Band } from "@/lib/describe"
import { currentRepositories } from "@/lib/session-repos"
import { Board } from "./board-client"

export const dynamic = "force-dynamic"

/** Low is omitted: a board is for triage, and nobody triages the bottom band. */
const COLUMNS: Band[] = ["critical", "high", "moderate"]

/** Deep enough to be useful, shallow enough that a column stays scannable. */
const PER_COLUMN = 20

export default async function RepoBoard({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentRepositories()
  if (session.state !== "ok") redirect("/")

  const { id } = await params
  const repositoryId = Number(id)
  if (!Number.isFinite(repositoryId)) notFound()

  // The list is already scoped to this user's installations, so finding the
  // repository in it *is* the access check — and it costs no extra query,
  // because the sidebar has already loaded the same list this render.
  const repo = session.repos.find((candidate) => candidate.id === repositoryId)
  if (!repo) notFound()

  const [counts, ...lists] = await Promise.all([
    todoCounts(repositoryId),
    ...COLUMNS.map((band) => rankedTodos(repositoryId, { bands: [band], limit: PER_COLUMN })),
  ])

  const columns = COLUMNS.map((band, index) => ({
    band,
    total: counts[band],
    todos: lists[index],
  }))

  // One query for every card on screen rather than one per opened panel: at
  // three columns of twenty it is a small fetch, and it lets a card show that a
  // discussion exists without being opened first.
  const comments = await commentsFor(columns.flatMap((column) => column.todos.map((t) => t.id)))

  return (
    <main className="w-full px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {counts.open} open · worst first in each column
        </p>
      </header>

      <Board columns={columns} counts={counts} repo={repo} comments={comments} />
    </main>
  )
}
