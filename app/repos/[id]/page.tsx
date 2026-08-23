import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { rankedTodos, type RankedTodo } from "@/db/ranking"
import { getRepository } from "@/db/repository"
import { accessibleInstallationIds, GitHubAuthError } from "@/lib/access"
import { age, blobUrl } from "@/lib/format"

export const dynamic = "force-dynamic"

/** Marker styling by how much the comment admits is wrong. */
const CHIP: Record<string, string> = {
  FIXME: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  BUG: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  HACK: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  XXX: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  TODO: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
}

const NEUTRAL_CHIP = "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"

function Factor({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${value.toFixed(2)}`}>
      <span className="w-11 text-[10px] uppercase tracking-wide text-neutral-400">{label}</span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <span
          className="block h-full rounded-full bg-neutral-500 dark:bg-neutral-400"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
    </div>
  )
}

function Row({
  todo,
  rank,
  repo,
}: {
  todo: RankedTodo
  rank: number
  repo: { owner: string; name: string; defaultBranch: string }
}) {
  const label = todo.marker ?? todo.category ?? "?"

  return (
    <li className="flex gap-4 border-b border-neutral-200 py-4 last:border-0 dark:border-neutral-800">
      <div className="flex w-12 shrink-0 flex-col items-center pt-0.5">
        <span className="text-lg font-semibold tabular-nums">{todo.score}</span>
        <span className="text-[10px] text-neutral-400">#{rank}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm break-words">{todo.text}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className={`rounded px-1.5 py-0.5 font-medium ${CHIP[label] ?? NEUTRAL_CHIP}`}>
            {label}
          </span>
          <a
            href={blobUrl(repo, todo.filePath, todo.line)}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline-offset-2 hover:underline"
          >
            {todo.filePath}:{todo.line}
          </a>
          <span>{todo.authorLogin ?? "unknown author"}</span>
          <span title="Age of the comment itself, from git blame">{age(todo.authoredAt)} old</span>
          <span title="Commits touching this file in the last year">
            {todo.fileChurn ?? 0} commits/yr
          </span>
        </div>

        {/* Shown inline rather than hidden: a ranking nobody can interrogate is
            a ranking nobody trusts. */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Factor label="age" value={todo.ageFactor} />
          <Factor label="churn" value={todo.churnFactor} />
          <Factor label="orphan" value={todo.orphanFactor} />
          <Factor label="sev" value={todo.severityFactor} />
        </div>
      </div>
    </li>
  )
}

export default async function RepoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.accessToken) redirect("/")

  const { id } = await params
  const repositoryId = Number(id)
  if (!Number.isFinite(repositoryId)) notFound()

  let installationIds: number[]
  try {
    installationIds = await accessibleInstallationIds(session.accessToken)
  } catch (error) {
    // An expired token sends the reader home, where the sign-in prompt explains.
    if (error instanceof GitHubAuthError) redirect("/")
    throw error
  }

  // Returns null both for a repository that does not exist and for one this
  // user may not see — deliberately indistinguishable from outside.
  const repo = await getRepository(repositoryId, installationIds)
  if (!repo) notFound()

  const todos = await rankedTodos(repositoryId)

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          ← all repositories
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {todos.length} open {todos.length === 1 ? "item" : "items"}, worst first
        </p>
      </header>

      {todos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing outstanding.</p>
        </div>
      ) : (
        <ul>
          {todos.map((todo, i) => (
            <Row key={todo.id} todo={todo} rank={i + 1} repo={repo} />
          ))}
        </ul>
      )}
    </main>
  )
}
