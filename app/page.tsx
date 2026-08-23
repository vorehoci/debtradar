import Link from "next/link"
import { auth } from "@/auth"
import { listRepositories } from "@/db/repository"
import { accessibleInstallationIds, GitHubAuthError } from "@/lib/access"
import { describeRepo } from "@/lib/describe"
import { SignIn, SignOut } from "./auth-buttons"

export const dynamic = "force-dynamic"

function SignedOut({ notice }: { notice?: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">debtradar</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        TODOs ranked by how much they are likely to hurt.
      </p>
      {notice ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-500">{notice}</p>
      ) : null}
      <div className="mt-8">
        <SignIn />
      </div>
    </main>
  )
}

export default async function Home() {
  const session = await auth()
  if (!session?.accessToken) return <SignedOut />

  let installationIds: number[]
  try {
    installationIds = await accessibleInstallationIds(session.accessToken)
  } catch (error) {
    // GitHub App user tokens expire after eight hours, so an expired session is
    // an ordinary state to render, not a crash.
    if (error instanceof GitHubAuthError) {
      return <SignedOut notice="Your GitHub session expired. Sign in again to continue." />
    }
    throw error
  }

  const repos = await listRepositories(installationIds)

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">debtradar</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            TODOs ranked by how much they are likely to hurt.
          </p>
        </div>
        <SignOut label={session.user?.name ?? "signed in"} />
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
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">{repo.owner}/</span>
                    <span className="font-medium">{repo.name}</span>
                  </div>
                  {/* Bands rather than a score: "nothing urgent" is reassuring
                      where "22/100" reads like a failing grade. */}
                  <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {describeRepo(repo)}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs text-neutral-400 tabular-nums dark:text-neutral-500"
                  title="Resolved since debtradar started watching"
                >
                  {repo.resolved} resolved
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
