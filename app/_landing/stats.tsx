import { MARKERS } from "@/lib/todos"

/**
 * Three facts about the product, every one of them checkable.
 *
 * This section used to read "12.4M TODOs indexed", "38,910 repos scanned" and
 * "91% triage accuracy". None of those were measurements — the file's own
 * comment admitted they were fixed strings — and debtradar has had very few
 * installations, so all three were traction claims that were simply untrue.
 * A fabricated number on a public page is a claim, not decoration, and
 * PRODUCT.md records that this product has no benchmarks to quote.
 *
 * What replaced them are properties of the code rather than of a customer
 * base: the marker list is imported so it cannot drift from the scanner, the
 * four signals are the four factors in `scoreExpression`, and the zero is a
 * consequence of the App never requesting write access to anything.
 */
const STATS: [string, string][] = [
  [String(MARKERS.length), "markers recognised"],
  ["4", "signals behind every score"],
  ["0", "issues filed in your tracker"],
]

export function Stats() {
  return (
    <section
      aria-label="How the score is built"
      className="flex w-full justify-center px-[clamp(20px,4vw,56px)] py-[clamp(36px,5vw,64px)]"
    >
      <div className="grid w-full max-w-[1120px] grid-cols-1 gap-px bg-edge sm:grid-cols-3">
        {STATS.map(([figure, label]) => (
          <div key={label} className="flex flex-col gap-2 bg-void px-6 py-8 sm:px-8">
            <p className="tabular text-[clamp(34px,4vw,52px)] leading-none font-semibold tracking-[-.03em] [font-stretch:76%]">
              {figure}
            </p>
            <p className="text-[12px] tracking-[.18em] text-muted uppercase">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
