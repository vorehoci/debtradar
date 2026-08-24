import { currentRepositories } from "@/lib/session-repos"
import { Header } from "./header"
import { Sidebar } from "./sidebar"

/**
 * Signed-in shell. The header and sidebar live here rather than in each page so
 * they survive navigation between the repository list and a board instead of
 * remounting and flashing.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentRepositories()

  // Signed out, the page is a sign-in prompt; a navigation rail around it would
  // suggest an app the visitor cannot reach yet.
  if (session.state !== "ok") return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.user} />

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <Sidebar repos={session.repos.map(({ id, owner, name }) => ({ id, owner, name }))} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
