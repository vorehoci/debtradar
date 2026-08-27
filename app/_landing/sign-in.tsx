import { signIn } from "@/auth"

/**
 * Sign-in as a form rather than a link, because Auth.js starts the OAuth
 * handshake in a server action. The styling is passed in so the nav's pill and
 * the hero's primary button share one definition of what signing in *does*.
 */
export function SignInButton({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("github", { redirectTo: "/dashboard" })
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
