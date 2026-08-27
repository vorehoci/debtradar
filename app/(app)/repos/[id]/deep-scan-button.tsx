"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deepScanStatus, startDeepScan } from "./actions"

/**
 * How often to ask whether the scan has finished, and when to give up.
 *
 * Three seconds is well under the time a scan takes and cheap — the answer is
 * two columns from one indexed row. The ceiling exists because the browser has
 * no way to learn that a job failed: Inngest retries out of band, and a run that
 * dies leaves `deep_scan_at` untouched forever. Without it the page would spin
 * for the rest of the session.
 */
const POLL_MS = 3000
const GIVE_UP_MS = 10 * 60 * 1000

type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "running" }
  | { name: "done"; found: number }
  | { name: "unchanged"; found: number }
  | { name: "problem"; message: string }

export function DeepScanButton({
  repositoryId,
  lastScanAt,
}: {
  repositoryId: number
  /** The completed scan already on the page, as the baseline to beat. */
  lastScanAt: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [phase, setPhase] = useState<Phase>({ name: "idle" })

  /**
   * The value `deep_scan_at` has to move past for the run to count as finished.
   *
   * A ref, not state: it is read inside the polling effect and changing it must
   * not restart that effect. It starts at whatever the server rendered, so a
   * repository scanned last week does not report itself as freshly done.
   */
  const baseline = useRef(lastScanAt)

  useEffect(() => {
    if (phase.name !== "running") return

    let cancelled = false
    const startedAt = Date.now()

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        clearInterval(timer)
        if (!cancelled) {
          setPhase({
            name: "problem",
            message: "Still running after ten minutes. Reload the page to check on it.",
          })
        }
        return
      }

      try {
        const status = await deepScanStatus(repositoryId)
        if (cancelled) return

        // Strictly greater: an unchanged timestamp means the job has not
        // written its result yet, and equal-to-baseline is the previous run.
        if (status.at && (!baseline.current || status.at > baseline.current)) {
          clearInterval(timer)
          baseline.current = status.at
          setPhase({ name: "done", found: status.found ?? 0 })
          // The rows the scan created are server-rendered, so the page has to
          // re-fetch for the banner's number and the board to agree.
          router.refresh()
        }
      } catch {
        // A transient failure mid-poll is not worth surfacing — the next tick
        // asks again, and the ceiling above still applies.
      }
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [phase.name, repositoryId, router])

  const busy = pending || phase.name === "starting" || phase.name === "running"

  function start() {
    setPhase({ name: "starting" })

    startTransition(async () => {
      try {
        const result = await startDeepScan(repositoryId)

        if (result.state === "unchanged") {
          // Nothing queued, so nothing to poll for. Reported as a finished
          // scan rather than a failure, because it is one — just an older one.
          setPhase({ name: "unchanged", found: result.found })
          return
        }

        if (result.state === "rate-limited") {
          setPhase({
            name: "problem",
            message: `Daily scan limit reached. Try again in about ${Math.ceil(
              result.resetInSeconds / 3600,
            )} hours.`,
          })
          return
        }

        setPhase({ name: "running" })
      } catch {
        setPhase({ name: "problem", message: "Could not start the scan." })
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={start}
        aria-busy={busy}
        className="inline-flex items-center gap-2 rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? <Spinner /> : null}
        {phase.name === "running"
          ? "Scanning with Claude…"
          : phase.name === "starting" || pending
            ? "Starting…"
            : "Find unmarked TODOs with Claude"}
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
    phase.name === "unchanged"
      ? `This commit has already been read — Claude found ${phase.found} unmarked ${
          phase.found === 1 ? "TODO" : "TODOs"
        }. Push a change to scan again.`
      : phase.name === "running"
        ? "Reading every unmarked comment. This usually takes a minute or two — you can leave the page open."
        : phase.name === "starting"
          ? "Queueing…"
          : phase.name === "done"
            ? phase.found === 0
              ? "Finished. Claude found no unmarked TODOs this time."
              : `Finished. Claude found ${phase.found} unmarked ${phase.found === 1 ? "TODO" : "TODOs"} — they are on the board now.`
            : phase.message

  return (
    <p
      // Announced rather than merely drawn: the outcome arrives minutes after
      // the click, by which point the reader is unlikely to be watching this
      // corner of the screen.
      role="status"
      aria-live="polite"
      className={`mt-2 text-[11px] ${
        phase.name === "done" || phase.name === "unchanged"
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
