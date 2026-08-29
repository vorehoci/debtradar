import type { Metadata } from "next"
import Link from "next/link"
import { SignInButton } from "@/app/_landing/sign-in"
import { currentRepositories } from "@/lib/session-repos"
import { setupOutcome } from "@/lib/setup-outcome"
import { InstallProgress, RecordOutcome } from "./installed-view"

/**
 * GitHub sends people here with query parameters, so nothing about the page is
 * static — and it must never be cached, or the second person through would see
 * the first person's state.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Installed",
  // A step inside a hand-off, reachable only from GitHub. Indexing it would put
  // a page that says "you're all set" in front of people who have installed
  // nothing.
  robots: { index: false, follow: false },
}

const ACTION = "bg-mint text-surface hover:bg-mint/90"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      {children}
    </main>
  )
}

function Check() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-full bg-mint text-surface"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none">
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export default async function Installed(props: PageProps<"/installed">) {
  const params = await props.searchParams
  const outcome = setupOutcome(params)

  /**
   * The same question the landing page and the dashboard ask, so all three
   * agree on what "signed in" means.
   *
   * Reading `session.accessToken` directly is not the same test and gets this
   * wrong once a day: a GitHub App user token expires after eight hours, and an
   * expired token is still a token in the cookie. This page would then offer a
   * dashboard link, the dashboard would ask GitHub, get a 401, and redirect
   * back to the landing page — so the button appeared to do nothing, at the
   * worst possible moment in the funnel.
   */
  const session = await currentRepositories()
  const signedIn = session.state === "ok"
  const expired = session.state === "expired"

  if (outcome.kind === "requested") {
    return (
      <Shell>
        <RecordOutcome outcome="requested" />

        <h1 className="text-2xl font-semibold tracking-tight">Waiting on an owner</h1>
        <p className="mt-2 text-muted">
          You have asked to install debtradar on an organisation you do not administer. GitHub has
          sent the request to its owners — nothing is installed and no code has been read yet.
        </p>
        <p className="mt-4 text-sm text-muted">
          You will get an email from GitHub when someone answers. If it is urgent, it is usually
          faster to ask them directly than to wait.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-subtle underline-offset-4 hover:underline"
          >
            Check the request on GitHub ↗
          </a>
          <Link href="/" className="text-sm text-subtle underline-offset-4 hover:underline">
            Back to debtradar
          </Link>
        </div>
      </Shell>
    )
  }

  if (outcome.kind === "unknown") {
    // Someone who bookmarked this, refreshed after the parameters were dropped,
    // or typed it in. Claiming an install happened would be a lie, so this says
    // only what is certain and points at the page that can tell them the truth.
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight">Nothing to confirm here</h1>
        <p className="mt-2 text-muted">
          This page is where GitHub sends you after installing debtradar. Reaching it directly means
          there is no installation to report on.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${ACTION}`}
          >
            {signedIn ? "Go to your dashboard" : "Back to debtradar"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Shell>
    )
  }

  const updated = outcome.kind === "updated"

  return (
    <Shell>
      <div className="flex items-center gap-3.5">
        <Check />
        <h1 className="text-2xl font-semibold tracking-tight">
          {updated ? "Access updated" : "debtradar is installed"}
        </h1>
      </div>

      <p className="mt-4 text-muted">
        {updated
          ? "GitHub has saved your new repository selection. Anything newly added is being scanned now; anything you removed stops being watched immediately."
          : "GitHub has granted access, and a full scan of every repository you selected is already running. There is nothing else to set up."}
      </p>

      <ul className="mt-6 space-y-2.5 text-sm text-muted">
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="text-subtle">
            —
          </span>
          <span>
            The first pass reads <code className="font-mono text-xs">TODO</code> and{" "}
            <code className="font-mono text-xs">FIXME</code> markers, then ranks them by age, file
            churn, and whether the author is still around.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="text-subtle">
            —
          </span>
          <span>
            Debt nobody labelled is found by the Claude scan, which you start yourself from a
            repository&rsquo;s page. It is the expensive one, so it never runs on its own.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="text-subtle">
            —
          </span>
          <span>
            From here on, pushes to your default branch keep the board current without you doing
            anything.
          </span>
        </li>
      </ul>

      {signedIn ? (
        <InstallProgress signedIn outcome={updated ? "updated" : "installed"} />
      ) : (
        <div className="mt-6 rounded-lg border border-edge p-5">
          <RecordOutcome outcome={updated ? "updated" : "installed"} />

          <p className="text-sm text-muted">
            {expired
              ? "Your installation is safe — it is this browser's session that has run out. GitHub signs you out after eight hours. Sign in again to see what the scan found."
              : "Installing the app and signing in are separate steps — GitHub knows about the installation, but this browser has no session yet. Sign in to see what the scan found."}
          </p>

          <SignInButton
            className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${ACTION}`}
          >
            {expired ? "Sign in again" : "Sign in with GitHub"}
            <span aria-hidden="true">→</span>
          </SignInButton>
        </div>
      )}

      <p className="mt-8 text-xs text-faint">
        debtradar reads code and metadata. The only thing it writes is a neutral, non-blocking check
        on pull requests — never your files.
      </p>
    </Shell>
  )
}
