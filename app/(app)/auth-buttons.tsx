import { signIn, signOut } from "@/auth"

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("github", { redirectTo: "/" })
      }}
    >
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Sign in with GitHub
      </button>
    </form>
  )
}

export function SignOut({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    >
      <button
        type="submit"
        className="text-xs text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
      >
        {label} · sign out
      </button>
    </form>
  )
}
