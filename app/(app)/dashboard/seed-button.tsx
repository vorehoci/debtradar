"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { seedMyRepositories, seededRepositoryCount } from "./actions"

/**
 * How often to ask whether rows have appeared, and when to stop asking.
 *
 * A seed is much quicker than a Claude scan — a tarball and a regex pass — but
 * an organisation with hundreds of repositories queues them behind one another,
 * so the ceiling is generous. It exists at all because the browser cannot learn
 * that a job died: Inngest retries out of band, and a run that gives up leaves
 * no trace here. Without a ceiling this would spin for the rest of the session,
 * which is the failure mode the whole component was written to remove.
 */
const POLL_MS = 3000
const GIVE_UP_MS = 5 * 60 * 1000

type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "waiting" }
  | { name: "done" }
  | { name: "problem"; message: string }

export function SeedButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [phase, setPhase] = useState<Phase>({ name: "idle" })

  /**
   * A ref, not state: the polling effect reads it, and changing it must not
   * tear the interval down and start a fresh one.
   */
  const stopped = useRef(false)

  useEffect(() => {
    if (phase.name !== "waiting") return

    stopped.current = false
    const startedAt = Date.now()

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        clearInterval(timer)
        if (!stopped.current) {
          setPhase({
            name: "problem",
            message:
              "Still nothing after five minutes. Reload the page, or check that the app can still see your repositories on GitHub.",
          })
        }
        return
      }

      try {
        const count = await seededRepositoryCount()
        if (stopped.current) return

        if (count > 0) {
          clearInterval(timer)
          setPhase({ name: "done" })
          // The list is server-rendered, so the page has to re-fetch before the
          // repositories this just created can replace the empty state.
          router.refresh()
        }
      } catch {
        // A transient failure mid-poll is not worth surfacing — the next tick
        // asks again, and the ceiling above still applies.
      }
    }, POLL_MS)

    return () => {
      stopped.current = true
      clearInterval(timer)
    }
  }, [phase.name, router])

  const busy = pending || phase.name === "starting" || phase.name === "waiting"

  function start() {
    setPhase({ name: "starting" })

    startTransition(async () => {
      try {
        const result = await seedMyRepositories()

        if (result.state === "not-installed") {
          setPhase({
            name: "problem",
            message: "GitHub says the app is not installed on any account. Install it first.",
          })
          return
        }

        if (result.state === "empty") {
          setPhase({
            name: "problem",
            message:
              "The app is installed but has not been given access to any repository. Add one under Repository access on GitHub.",
          })
          return
        }

        if (result.state === "rate-limited") {
          setPhase({
            name: "problem",
            message: `Already queued a few times recently. Try again in about ${Math.ceil(
              result.resetInSeconds / 60,
            )} minutes.`,
          })
          return
        }

        setPhase({ name: "waiting" })
      } catch {
        setPhase({ name: "problem", message: "Could not reach GitHub. Try again in a moment." })
      }
    })
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={busy}
        onClick={start}
        aria-busy={busy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-mint px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-mint/90 disabled:cursor-default disabled:opacity-50"
      >
        {busy ? <Spinner /> : null}
        {phase.name === "waiting"
          ? "Scanning…"
          : phase.name === "starting" || pending
            ? "Asking GitHub…"
            : "Scan my repositories"}
      </button>

      <Status phase={phase} />
    </div>
  )
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 animate-spin motion-reduce:animate-none"
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Status({ phase }: { phase: Phase }) {
  if (phase.name === "idle") return null

  const message =
    phase.name === "starting"
      ? "Asking GitHub which repositories this installation can see…"
      : phase.name === "waiting"
        ? "Queued. Repositories appear here as each one finishes — you can leave the page open."
        : phase.name === "done"
          ? "Found them. Loading your board…"
          : phase.message

  return (
    <p
      // Announced rather than merely drawn: the outcome arrives long after the
      // click, by which point the reader is unlikely to be watching this corner
      // of the screen.
      role="status"
      aria-live="polite"
      className={`mt-2.5 text-xs ${
        phase.name === "done"
          ? "text-mint"
          : phase.name === "problem"
            ? "text-amber-500"
            : "text-muted"
      }`}
    >
      {message}
    </p>
  )
}
