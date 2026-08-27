"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

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

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
        active ? "bg-mint/10 font-medium text-mint" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  )
}

export function Sidebar({ repos }: { repos: SidebarRepo[] }) {
  const pathname = usePathname()
  // The two board views differ by a query parameter, and `usePathname` does not
  // include one — so highlighting the right entry needs the search params too.
  const searchParams = useSearchParams()
  const repoId = currentRepoId(pathname)
  const active = repoId === null ? null : repos.find((repo) => repo.id === repoId)
  const onBoard = pathname.endsWith("/board")
  const listView = searchParams.get("view") === "list"

  return (
    <nav className="flex shrink-0 flex-col gap-1 border-b border-edge bg-panel p-4 sm:w-56 sm:border-r sm:border-b-0">
      <Link
        href="/dashboard"
        className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
          repoId === null ? "bg-mint/10 font-medium text-mint" : "text-muted hover:text-ink"
        }`}
      >
        Home
      </Link>

      {active ? (
        <div className="mt-3 border-t border-edge pt-3">
          <p className="px-2.5 text-[11px] uppercase tracking-wide text-faint">Repository</p>
          <p className="mt-1 mb-2 px-2.5 text-sm font-medium break-words">
            <span className="text-muted">{active.owner}/</span>
            {active.name}
          </p>

          <div className="flex gap-1 sm:flex-col">
            {/* `endsWith` rather than an exact match so the overview stays
                highlighted if it ever grows sub-routes of its own. */}
            <NavLink href={`/repos/${active.id}`} active={!onBoard}>
              Overview
            </NavLink>

            {/* Neither link carries the current filters. Switching view from the
                sidebar is navigation, like picking a repository, and arriving on
                a view still narrowed by a search typed on the other one reads as
                the app having lost rows. */}
            <NavLink href={`/repos/${active.id}/board`} active={onBoard && !listView}>
              Board
            </NavLink>
            <NavLink href={`/repos/${active.id}/board?view=list`} active={onBoard && listView}>
              List
            </NavLink>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
