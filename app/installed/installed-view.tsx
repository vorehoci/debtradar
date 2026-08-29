"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { track } from "@vercel/analytics/react"
import { seededRepositoryCount } from "@/app/(app)/dashboard/actions"

/**
 * Reaching this component means somebody completed GitHub's consent screen,
 * which is the only conversion this product has. It is recorded as a custom
 * event so the number stands on its own in the analytics dashboard rather than
 * having to be inferred from a page view that a reload would double-count.
 *
 * No installation id travels with it. The id identifies a customer's GitHub
 * account, and `lib/redact-url.ts` already strips it from the URL for exactly
 * that reason — sending it back as an event property would undo that work.
 */
function useConversionOnce(outcome: string) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    track("install", { outcome })
  }, [outcome])
}

const POLL_MS = 3000
const GIVE_UP_MS = 3 * 60 * 1000

/**
 * Watches for the first repository to land, so the page can say something true
 * about progress instead of guessing.
 *
 * Installing queues a seed per repository through a webhook, and the browser
 * has no way to be told when one finishes. Polling a count is the honest
 * approximation: it can say "nothing yet" and "here they are", which is the
 * whole question the reader has.
 *
 * Signed-out visitors skip this entirely — the count is scoped to a session,
 * and there is nothing to poll for until they sign in.
 */
function useRepositoryCount(enabled: boolean) {
  const [count, setCount] = useState<number | null>(null)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let stopped = false
    const startedAt = Date.now()

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        clearInterval(timer)
        if (!stopped) setGaveUp(true)
        return
      }

      try {
        const next = await seededRepositoryCount()
        if (stopped) return
        setCount(next)
        if (next > 0) clearInterval(timer)
      } catch {
        // The next tick asks again; the ceiling above still applies.
      }
    }, POLL_MS)

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [enabled])

  return { count, gaveUp }
}

export function InstallProgress({ signedIn, outcome }: { signedIn: boolean; outcome: string }) {
  useConversionOnce(outcome)

  const { count, gaveUp } = useRepositoryCount(signedIn)

  if (!signedIn) return null

  const message =
    count === null
      ? "Checking what GitHub has sent over…"
      : count > 0
        ? `${count} ${count === 1 ? "repository is" : "repositories are"} ready.`
        : gaveUp
          ? "Still nothing. The dashboard has a button that asks GitHub directly and queues the scan again."
          : "Queued. Each repository appears as its scan finishes — large ones take a few minutes."

  return (
    <div className="mt-6 rounded-lg border border-edge p-5">
      <p
        // The outcome arrives long after the page is read, so it is announced
        // rather than only drawn.
        role="status"
        aria-live="polite"
        className={`text-sm ${count && count > 0 ? "text-mint" : gaveUp ? "text-amber-500" : "text-muted"}`}
      >
        {message}
      </p>

      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-mint/90"
      >
        {count && count > 0 ? "Open your board" : "Go to the dashboard"}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

/** Fires the conversion on the outcomes that have no progress to report. */
export function RecordOutcome({ outcome }: { outcome: string }) {
  useConversionOnce(outcome)
  return null
}
