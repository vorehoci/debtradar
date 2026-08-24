import Link from "next/link"
import { describeRepo } from "@/lib/describe"
import { currentRepositories } from "@/lib/session-repos"
import { SignIn } from "./auth-buttons"
import { Logo } from "./logo"

export const dynamic = "force-dynamic"

function SignedOut({ notice }: { notice?: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      {/* The signed-out page has no header, so the mark belongs here too —
          otherwise the first screen a visitor sees is the only one without it. */}
      <h1>
        <Logo className="h-8 w-auto text-[#07845d] dark:text-[#6dffc6]" />
      </h1>
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
  const result = await currentRepositories()

  if (result.state === "signed-out") return <SignedOut />
  if (result.state === "expired") {
    return <SignedOut notice="Your GitHub session expired. Sign in again to continue." />
  }


  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {/* Sign-out moved to the app header, which is on every page rather than
          only this one. */}
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          TODOs ranked by how much they are likely to hurt.
        </p>
      </header>

      {result.repos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No repositories yet. Install the app and push to a default branch.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {result.repos.map((repo) => (
            <li key={repo.id}>
              <Link
                href={`/repos/${repo.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-5 py-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
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
                  className="shrink-0 text-xs tabular-nums text-neutral-400 dark:text-neutral-500"
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
