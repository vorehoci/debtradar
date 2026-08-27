import Link from "next/link"
import { redirect } from "next/navigation"
import { describeRepo } from "@/lib/describe"
import { currentRepositories } from "@/lib/session-repos"
import { AddRepositories, GetStarted } from "./get-started"

export const dynamic = "force-dynamic"

/**
 * The signed-in home.
 *
 * It used to be `/`, and carried a signed-out branch that doubled as the only
 * public page. `/` is now the landing page, so anyone who arrives here without
 * a session is sent there rather than shown a sign-in prompt wearing the
 * application's chrome.
 */
export default async function Dashboard() {
  const result = await currentRepositories()
  if (result.state !== "ok") redirect("/")

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <p className="mt-1 text-sm text-muted">TODOs ranked by how much they are likely to hurt.</p>
      </header>

      {result.repos.length === 0 ? (
        <GetStarted installed={result.installationIds.length > 0} />
      ) : (
        <ul className="space-y-2">
          {result.repos.map((repo) => (
            <li key={repo.id}>
              <Link
                href={`/repos/${repo.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-edge px-5 py-4 transition-colors hover:border-edge-strong"
              >
                <div>
                  <div>
                    <span className="text-muted">{repo.owner}/</span>
                    <span className="font-medium">{repo.name}</span>
                  </div>
                  {/* Bands rather than a score: "nothing urgent" is reassuring
                      where "22/100" reads like a failing grade. */}
                  <p className="mt-0.5 text-sm text-muted">{describeRepo(repo)}</p>
                </div>
                <span
                  className="shrink-0 text-xs tabular-nums text-faint"
                  title="Resolved since debtradar started watching"
                >
                  {repo.resolved} resolved
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Only alongside a populated list: the empty state's own panel already
          ends in an install button, and two on one screen would compete. */}
      {result.repos.length > 0 ? <AddRepositories /> : null}
    </main>
  )
}
