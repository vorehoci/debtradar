"use client"

import { useState, useTransition } from "react"
import { startDeepScan } from "./actions"

export function DeepScanButton({ repositoryId }: { repositoryId: number }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null)
          startTransition(async () => {
            try {
              const result = await startDeepScan(repositoryId)
              setMessage(
                result.state === "queued"
                  ? "Queued. New TODOs appear on the board as it finishes — about a minute."
                  : `Daily scan limit reached. Try again in about ${Math.ceil(result.resetInSeconds / 3600)} hours.`,
              )
            } catch {
              setMessage("Could not start the scan.")
            }
          })
        }}
        className="rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Find unmarked TODOs with Claude"}
      </button>

      {message ? (
        <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{message}</p>
      ) : null}
    </div>
  )
}
