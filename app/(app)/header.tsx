import Image from "next/image"
import Link from "next/link"
import { signOut } from "@/auth"
import type { SessionUser } from "@/lib/session-repos"
import { Logo } from "./logo"

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
      <Link href="/" aria-label="debtradar home">
        <Logo className="h-5 w-auto text-[#07845d] dark:text-[#6dffc6]" />
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

        <span className="hidden text-xs text-neutral-600 sm:inline dark:text-neutral-300">
          {user.name}
        </span>

        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <button
            type="submit"
            className="cursor-pointer rounded border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
