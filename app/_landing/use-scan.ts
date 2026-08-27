"use client"

import { useEffect, useState } from "react"

export type Scan = { pct: number; file: string; hotspots: number }

/** What the readout shows before the scene has said anything. */
const INITIAL: Scan = { pct: 0, file: "src/index.ts", hotspots: 3 }

/**
 * Sweep progress, as broadcast by the Spline scene roughly ten times a second.
 *
 * The scene renders itself and has no React API, so a `postMessage` is the only
 * channel it has back to the page. If it never sends one — because the scene
 * has not been wired to, or has not loaded — the readout simply holds the
 * values above rather than erroring or blanking.
 *
 * Messages are shape-checked before use. `window.message` is a public inbox:
 * any script, extension or embedded frame on the page can post to it, so a
 * payload arriving here is untrusted input rather than something the scene is
 * guaranteed to have sent.
 */
export function useScan(): Scan {
  const [scan, setScan] = useState<Scan>(INITIAL)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data !== "object" || data === null) return
      if ((data as { type?: unknown }).type !== "debtradar:scan") return

      const { pct, file, hotspots } = data as Partial<Scan>

      setScan((previous) => ({
        pct: typeof pct === "number" && Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : previous.pct,
        file: typeof file === "string" ? file : previous.file,
        hotspots:
          typeof hotspots === "number" && Number.isFinite(hotspots) ? hotspots : previous.hotspots,
      }))
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return scan
}
