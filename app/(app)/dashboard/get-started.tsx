import { appInstallUrl } from "@/lib/github"
import { TrackClick } from "@/app/_landing/track-click"
import { SeedButton } from "./seed-button"

/**
 * The affirmative control, matching the landing page.
 *
 * This was a darkened green because the app had a light theme where mint
 * measured 1.25:1 and vanished. The app is dark throughout now, so it can use
 * the brand accent — with the surface colour as the text, since mint is bright
 * enough that white on it is unreadable.
 */
const ACTION = "bg-mint text-surface hover:bg-mint/90"

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-medium tabular-nums text-surface">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{children}</p>
      </div>
    </li>
  )
}

/**
 * What a signed-in user sees before there is anything to look at.
 *
 * Split by cause rather than shown as one message, because the two empty states
 * need opposite things from the reader: one has to go to GitHub and grant
 * access, the other has already done that and simply has to wait or push. A
 * single "no repositories yet" leaves both of them guessing which they are.
 */
export async function GetStarted({ installed }: { installed: boolean }) {
  if (installed) return <AwaitingFirstScan />

  // Resolved here rather than at module load: it is one cached GitHub call, and
  // a failure should not take down the whole dashboard for users who do have
  // repositories.
  const href = await appInstallUrl()

  return (
    <section className="rounded-lg border border-edge p-8">
      <h2 className="text-base font-semibold tracking-tight">Install debtradar on GitHub</h2>
      <p className="mt-1 text-sm text-muted">
        debtradar reads code through a GitHub App, so it needs access to a repository before it can
        rank anything.
      </p>

      <ol className="mt-6 space-y-4">
        <Step n={1} title="Choose where to install it">
          Pick your personal account or an organisation you administer. Organisation installs may
          need an owner to approve them.
        </Step>
        <Step n={2} title="Select repositories">
          All repositories, or just a few. You can change the selection later on GitHub without
          reinstalling. Only repositories you administer are listed — to scan someone else&rsquo;s
          project, fork it first and install on the fork.
        </Step>
        <Step n={3} title="Come back in a minute">
          Installing starts a full scan of every repository you selected, so there is nothing else
          to do. Ranked TODOs appear here as each one finishes; pushes keep them current after that.
        </Step>
      </ol>

      <TrackClick event="install-click" placement="get-started">
        <a
          href={href}
          // Opened in the same tab: this is a hand-off to GitHub that ends by
          // sending the user back, not a reference they read alongside the app.
          className={`mt-7 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${ACTION}`}
        >
          Install on GitHub
          <span aria-hidden="true">→</span>
        </a>
      </TrackClick>

      <p className="mt-4 text-xs text-faint">
        debtradar reads code and metadata. The only thing it writes is a neutral, non-blocking check
        on pull requests — never your files.
      </p>
    </section>
  )
}

function Reason({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="text-subtle">
        —
      </span>
      <span>{children}</span>
    </li>
  )
}

/**
 * Installed, but nothing has landed in the database yet.
 *
 * Installing queues a full scan of every selected repository, so the ordinary
 * cause is that the scan is still running rather than anything the reader has
 * to do — which is why waiting is what this panel leads with.
 *
 * It did not used to offer anything else, on the reasoning that no action would
 * help. That was wrong in the one case that matters. Seeding is triggered by
 * `installation.created`, which GitHub fires exactly once and never replays, so
 * an account that misses it — app cold at the wrong moment, a deploy mid-flight,
 * GitHub exhausting its retries — is stuck here permanently, being told to wait
 * for something that is never coming. The button is the way out, and it is
 * below the explanation rather than above it because pressing it is the rarer
 * case.
 */
function AwaitingFirstScan() {
  return (
    <section className="rounded-lg border border-dashed border-edge-strong p-8">
      <h2 className="text-base font-semibold tracking-tight">Scanning your repositories</h2>
      <p className="mt-1 text-sm text-muted">
        debtradar is installed and working through the code it was given access to. Large
        repositories take a few minutes. Reload to check.
      </p>

      <ul className="mt-5 space-y-2.5 text-sm text-muted">
        <Reason>
          If this has not changed after several minutes, nothing is running — start it yourself with
          the button below. It asks GitHub which repositories your installation can see and queues
          each one.
        </Reason>
        <Reason>
          A repository with no <code className="font-mono text-xs">TODO</code> or{" "}
          <code className="font-mono text-xs">FIXME</code> markers stays empty on purpose. Unmarked
          debt is found by the Claude scan, which runs from the repository page.
        </Reason>
      </ul>

      <SeedButton />

      <a
        href="https://github.com/settings/installations"
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block text-sm text-subtle underline-offset-4 hover:underline"
      >
        Review repository access on GitHub ↗
      </a>
    </section>
  )
}

/**
 * The install route, kept on the dashboard once repositories exist.
 *
 * Compact rather than the full three-step panel: someone with a board already
 * knows what installing does, and repeating the walkthrough above their own
 * repositories would bury the thing they came for. But it stays on the page
 * permanently, because adding a second repository is rare enough that nobody
 * remembers where the button was — and the alternative is hunting through
 * GitHub's own settings.
 *
 * Two destinations, because they are different jobs: installing on a new
 * account, and changing which repositories an existing installation can see.
 * The second is the one people get stuck on, since a partial install looks
 * exactly like a repository that has not been scanned yet.
 */
export async function AddRepositories() {
  let href: string
  try {
    href = await appInstallUrl()
  } catch {
    // One cached GitHub call, but the dashboard is the page a user with working
    // repositories relies on — it must not go down because the app lookup did.
    return null
  }

  return (
    <section className="mt-8 rounded-lg border border-dashed border-edge-strong p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Add another repository</h2>
          <p className="mt-0.5 text-sm text-muted">
            Install debtradar on another account, or change which repositories it can see.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-subtle underline-offset-4 hover:underline"
          >
            Manage access ↗
          </a>

          <TrackClick event="install-click" placement="add-repositories">
            <a
              href={href}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${ACTION}`}
            >
              Install on GitHub
              <span aria-hidden="true">→</span>
            </a>
          </TrackClick>
        </div>
      </div>
    </section>
  )
}
