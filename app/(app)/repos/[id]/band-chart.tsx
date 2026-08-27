import type { Band } from "@/lib/describe"
import { BANDS } from "@/lib/describe"

/**
 * The documented status palette — fixed, never themed, and deliberately not the
 * categorical one so a status colour never impersonates a series.
 *
 * `warning` and `serious` sit close (ΔE 13.6) and both fall under 3:1 on a light
 * surface. That is documented and accepted for status, on the condition that
 * colour never carries meaning alone: every bar here is labelled with its band
 * name and its count, so the palette is redundant encoding rather than the
 * identity channel.
 */
const BAND_FILL: Record<Band, string> = {
  critical: "#d03b3b",
  high: "#ec835a",
  moderate: "#fab219",
  low: "#0ca30c",
}

export function BandChart({ counts }: { counts: Record<Band, number> }) {
  const total = BANDS.reduce((sum, band) => sum + counts[band], 0)
  const widest = Math.max(1, ...BANDS.map((band) => counts[band]))

  if (total === 0) {
    return <p className="text-sm text-muted">Nothing outstanding.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {BANDS.map((band) => {
        const count = counts[band]
        const share = Math.round((count / total) * 100)

        return (
          <div key={band} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs capitalize text-subtle">{band}</span>

            {/* Scaled to the largest band rather than the total: with a long
                tail the small bands would otherwise be invisible slivers. */}
            <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-raised">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(count > 0 ? 2 : 0, (count / widest) * 100)}%`,
                  backgroundColor: BAND_FILL[band],
                }}
              />
            </span>

            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted">
              {count} <span className="text-faint">· {share}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
