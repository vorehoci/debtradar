import Link from "next/link"
import { listRepositories } from "@/db/repository"

export const dynamic = "force-dynamic"

export default async function Home() {
  const repos = await listRepositories()

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">debtradar</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          TODOs ranked by how much they are likely to hurt.
        </p>
      </header>

      {repos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No repositories yet. Install the app and push to a default branch.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {repos.map((repo) => (
            <li key={repo.id}>
              <Link
                href={`/repos/${repo.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-5 py-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
                  <span className="font-medium">{repo.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm tabular-nums">
                  <span title="Open TODOs">{repo.open} open</span>
                  <span className="text-neutral-400 dark:text-neutral-500" title="Resolved">
                    {repo.resolved} resolved
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
