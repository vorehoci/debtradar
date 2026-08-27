import Image from "next/image"
import Link from "next/link"
import { signOut } from "@/auth"
import type { SessionUser } from "@/lib/session-repos"
import { Brand } from "@/app/brand"

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-edge bg-panel px-5 py-3">
      <Link href="/dashboard" aria-label="debtradar home">
        <Brand className="text-[15px] text-ink" />
      </Link>

      <div className="flex items-center gap-3">
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={24}
            height={24}
            // Decorative: the name sits beside it, so announcing the avatar too
            // would just repeat the same fact to a screen reader.
            aria-hidden="true"
            className="rounded-full"
            unoptimized
          />
        ) : null}

        <span className="hidden text-xs text-subtle sm:inline">{user.name}</span>

        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <button
            type="submit"
            className="cursor-pointer rounded border border-edge-strong px-2.5 py-1 text-xs text-subtle transition-colors hover:border-edge-strong hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
