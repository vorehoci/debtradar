"use client"

import { useScan } from "./use-scan"

/**
 * The sweep readout, pinned bottom-left.
 *
 * A client component because it listens for the scene's broadcasts; everything
 * else in the hero is static copy and stays on the server.
 */
export function ScanConsole() {
  const scan = useScan()

  return (
    <div className="absolute bottom-[34px] left-[clamp(20px,4vw,56px)] w-[min(42vw,430px)] max-md:w-[88vw]">
      <div className="flex justify-between font-mono text-[11.5px] tracking-[.02em] text-muted">
        <span>
          scanning <span className="text-[#bfeee0]">{scan.file}</span>
        </span>
        <span className="tabular-nums">{scan.pct}%</span>
      </div>

      <div className="mt-[9px] h-0.5 overflow-hidden rounded-sm bg-white/[.09]">
        <div
          className="h-full bg-gradient-to-r from-mint/20 to-mint shadow-[0_0_12px_rgba(109,255,198,.7)] transition-[width] duration-[120ms] ease-linear"
          style={{ width: `${scan.pct}%` }}
        />
      </div>

      <div className="mt-4 flex gap-5 text-[11px] tracking-[.04em] text-muted">
        <span className="flex items-center gap-[7px]">
          <i className="size-2 rounded-sm bg-mint shadow-[0_0_8px_var(--color-mint)]" />
          HEALTHY MODULE
        </span>
        <span className="flex items-center gap-[7px]">
          <i className="size-2 rounded-sm bg-signal shadow-[0_0_8px_var(--color-signal)]" />
          DEBT HOTSPOT
        </span>
      </div>
    </div>
  )
}

/**
 * The one live number in the stats row.
 *
 * Split from the console rather than sharing state through a provider: the two
 * sit in different corners of the layout, and threading context through the
 * whole hero would push the static copy into the client bundle to move one
 * digit. Two listeners on the same event cost nothing.
 */
export function HotspotCount() {
  return (
    <b className="mb-[3px] block text-xl font-bold tracking-[-.02em] text-signal tabular-nums">
      {useScan().hotspots}
    </b>
  )
}
