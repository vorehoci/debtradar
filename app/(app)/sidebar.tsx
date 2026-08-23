"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export interface SidebarRepo {
  id: number
  owner: string
  name: string
}

/**
 * Resolves the current repository from the path rather than being told by the
 * page: a parent layout cannot receive a child route's params, and threading it
 * up through context would be more machinery than a regex over one URL shape.
 */
function currentRepoId(pathname: string): number | null {
  const match = /^\/repos\/(\d+)/.exec(pathname)
  return match ? Number(match[1]) : null
}

export function Sidebar({ repos }: { repos: SidebarRepo[] }) {
  const pathname = usePathname()
  const repoId = currentRepoId(pathname)
  const active = repoId === null ? null : repos.find((repo) => repo.id === repoId)

  return (
    <nav className="flex shrink-0 flex-col gap-1 border-b border-neutral-200 p-4 sm:w-56 sm:border-r sm:border-b-0 dark:border-neutral-800">
      <Link
        href="/"
        className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
          repoId === null
            ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        }`}
      >
        Home
      </Link>

      {active ? (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="px-2.5 text-[11px] uppercase tracking-wide text-neutral-400">Repository</p>
          <p className="mt-1 px-2.5 text-sm font-medium break-words">
            <span className="text-neutral-500 dark:text-neutral-400">{active.owner}/</span>
            {active.name}
          </p>
        </div>
      ) : null}
    </nav>
  )
}
