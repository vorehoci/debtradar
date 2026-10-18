import Link from "next/link"
import { Arrow } from "@/app/_icons"
import { rankedTodos } from "@/db/ranking"
import { DEMO_REPOSITORY_ID } from "@/lib/demo"
import { TrackClick } from "./track-click"

/**
 * The top four findings from the real n8n scan.
 *
 * Not illustrations. These rows are read out of the same table the board
 * reads, ranked by the same expression, so the page cannot drift from the
 * product: if the score changes, this changes. A landing page that invents its
 * own example is making a claim about a scan nobody ran.
 */

const BAND_MARK: Record<string, string> = {
  critical: "bg-band-critical",
  high: "bg-band-high",
  moderate: "bg-band-moderate",
  low: "bg-band-low",
}

/** Days since a timestamp, or null when the scan never established one. */
function daysSince(at: Date | null): number | null {
  if (!at) return null
  return Math.floor((Date.now() - at.getTime()) / 86_400_000)
}

/**
 * What this row is, in the product's own terms.
 *
 * `category` is non-null exactly when Claude found the debt rather than
 * reading a marker somebody wrote, which is the distinction the ranking
 * already discounts. Saying "undeclared" rather than showing a model's
 * confidence as a badge keeps the page honest about which of the two it is.
 */
function provenance(marker: string | null, category: string | null) {
  if (category) return { label: "Undeclared", inferred: true }
  return { label: marker ?? "Note", inferred: false }
}

export async function Ranked() {
  let rows: Awaited<ReturnType<typeof rankedTodos>> = []
  try {
    rows = await rankedTodos(DEMO_REPOSITORY_ID, { limit: 4 })
  } catch {
    // The hero above has already made the argument. A database hiccup should
    // cost this section its existence, not the page its first impression.
    return null
  }
  if (rows.length === 0) return null

  return (
    <section className="border-t border-edge bg-void px-[clamp(20px,4vw,56px)] py-[clamp(48px,7vw,96px)]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-[16ch] text-[clamp(28px,3.4vw,46px)] leading-[1.04] font-semibold tracking-[-.03em] [font-stretch:78%]">
          What it found in n8n, worst first
        </h2>

        <TrackClick event="cta" placement="ranked-demo">
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2.5 border border-edge-strong px-5 py-3 text-[13px] tracking-[.16em] text-subtle uppercase transition-colors hover:border-ember hover:text-ember"
          >
            Open the full board
            <Arrow />
          </Link>
        </TrackClick>
      </div>

      <ol className="grid gap-px bg-edge sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row, i) => {
          const { label, inferred } = provenance(row.marker, row.category)
          const age = daysSince(row.authoredAt)

          return (
            <li key={row.id} className="relative flex flex-col gap-4 bg-ink-deep p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/*
                    The band reads twice: as the mark's colour and as the word
                    beside it. Colour alone would make the whole ranking
                    invisible to a reader who cannot separate violet from
                    ember, which on this ramp is the difference between high
                    and critical.
                  */}
                  <span
                    aria-hidden="true"
                    className={`size-2.5 rotate-45 ${BAND_MARK[row.band] ?? "bg-band-low"} ${
                      inferred ? "opacity-60 outline outline-offset-2 outline-faint" : ""
                    }`}
                  />
                  <span className="text-[12px] tracking-[.2em] text-subtle uppercase">
                    {row.band}
                  </span>
                </div>

                {/* The number is the rank, which is the product. It is not a
                    decorative section index. */}
                <span className="tabular text-[13px] text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <p
                className={`line-clamp-3 text-[15.5px] leading-[1.5] ${
                  inferred ? "text-subtle italic" : "text-ink"
                }`}
              >
                {row.text}
              </p>

              <div className="mt-auto flex flex-col gap-2 border-t border-edge pt-4">
                <code className="truncate font-mono text-[12.5px] text-muted">
                  {row.filePath}:{row.line}
                </code>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-faint">
                  {/*
                    The score, labelled and sitting with the signals that
                    produced it.

                    The top four of a 792-row scan are all critical, so a row of
                    four identical band words made the product's wedge —
                    ranking, not detection — invisible in the one section built
                    to show it. This is the number that separates them.
                  */}
                  <span className="tabular font-semibold text-ink">
                    risk {Math.round(row.score)}
                  </span>
                  <span className="text-subtle">{label}</span>
                  {age !== null && (
                    <span className="tabular">{age.toLocaleString("en-US")}d old</span>
                  )}
                  {/* Null is not zero here: it means the scan never
                      established a churn figure for the file, which is a
                      different statement from "nothing has touched it". */}
                  {row.fileChurn != null && row.fileChurn > 0 && (
                    <span className="tabular">churn {row.fileChurn}</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
