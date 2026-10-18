import { linesRead, repositoryStats, todoCounts } from "@/db/ranking"
import { DEMO_REPOSITORY_ID } from "@/lib/demo"

/**
 * The figures in the loader's position, from the real n8n scan.
 *
 * One resolved line, not a row of big numbers. The first attempt shipped four
 * figure-and-label pairs, which is the hero-metric template the craft floor
 * refuses, and it dropped the half of the claim that makes the other half
 * mean anything: a count of findings says nothing until you know how much
 * code was read to find them.
 *
 * Every number is queried. `linesRead` comes off the cost ledger rather than
 * being typed in, so the sentence cannot quietly stop being true as the
 * repository grows.
 *
 * It is labelled as n8n rather than left ambiguous. An unlabelled count beside
 * a sign-in button reads as the visitor's own repository, which would be a
 * claim about a scan nobody has run yet.
 */

/** Millions to one decimal, thousands to none: "4.3M", "812k", "940". */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("en-US")}k`
  return n.toLocaleString("en-US")
}

export async function Readout() {
  let open: number
  let undeclared: number
  let lines: number | null

  try {
    const [counts, stats, scanned] = await Promise.all([
      todoCounts(DEMO_REPOSITORY_ID),
      repositoryStats(DEMO_REPOSITORY_ID),
      linesRead(DEMO_REPOSITORY_ID),
    ])
    open = counts.open
    undeclared = stats.classified
    lines = scanned
  } catch {
    // Same rule as the demo button: a database hiccup costs this slot its
    // numbers, never the hero its composition.
    return null
  }

  if (open === 0) return null

  return (
    <p className="max-w-[46ch] text-[clamp(14px,1.15vw,16.5px)] leading-[1.6] text-subtle">
      <span className="mb-2.5 block text-[11px] tracking-[.22em] text-faint uppercase">
        n8n-io/n8n — scanned
      </span>
      <strong className="tabular font-semibold text-ink">{open.toLocaleString("en-US")}</strong>{" "}
      notes ranked
      {lines !== null && (
        <>
          {" "}
          across{" "}
          <strong className="tabular font-semibold text-ink">{compact(lines)}</strong> lines
        </>
      )}
      .{" "}
      <strong className="tabular font-semibold text-ink">
        {undeclared.toLocaleString("en-US")}
      </strong>{" "}
      of them nobody wrote down.
    </p>
  )
}
