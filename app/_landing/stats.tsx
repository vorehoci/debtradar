/**
 * The stat band, directly under the hero.
 *
 * The figures are the design's, shipped as specified. They are not measurements
 * taken from anything in this codebase — `12.4M`, `38,910` and `91%` are fixed
 * strings — so if the page ever needs to defend them, this is the file to
 * change. The nearest real numbers live in the `repositories` and `todos`
 * tables.
 *
 * The design's fourth figure, `4.2s MEDIAN SCAN`, is gone from all three
 * frames: nothing times a scan, and a seed walks a whole repository tarball
 * through a queued job, so the honest order of magnitude is minutes.
 *
 * The three frames are genuinely different designs rather than one that
 * reflows — see `breakpoints.ts` for how they map onto Tailwind's screens:
 *
 *   mobile   a two-column grid of bordered cards, mint figures
 *   tablet   a bare row, mint figures, sentence-case labels in the sans face
 *   desktop  a bare row, near-white figures, wide-tracked mono caps
 */

/** figure, label — stored sentence-case, then cased per breakpoint below. */
const STATS: [string, string][] = [
  ["12.4M", "TODOs indexed"],
  ["38,910", "repos scanned"],
  ["91%", "triage accuracy"],
]

export function Stats() {
  return (
    <section
      aria-label="Stats"
      // Desktop keeps twice as much room above as below, measured to the text
      // rather than the boxes: the columns carry 30px of their own padding
      // there, so 70 puts 100px over the figures against 50 under the labels.
      // Tablet and mobile use the design's own symmetrical padding.
      className="flex w-full justify-center px-5 py-8 md:px-10 md:py-[30px] lg:px-[clamp(20px,4vw,56px)] lg:pt-[70px] lg:pb-5"
    >
      {/* Cards in a two-column grid on mobile, a bare row from tablet up. */}
      <div className="grid w-full max-w-[1120px] grid-cols-2 gap-3 md:flex md:gap-4 lg:gap-0">
        {STATS.map(([figure, label], index) => (
          <div
            key={label}
            className={`flex flex-col gap-1.5 rounded-xl border border-[#18241e] bg-[#0d1512] px-3.5 py-4 text-center md:flex-1 md:rounded-none md:border-0 md:bg-transparent md:p-0 lg:basis-1/3 lg:gap-2 lg:py-[30px] ${
              // An odd count in a two-up grid leaves a hole that reads as a
              // missing fourth stat, so the last card spans the row instead.
              index === STATS.length - 1 ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <p className="text-[26px] leading-none font-bold text-mint md:text-[30px] lg:text-[34px] lg:text-[#eaf6f0]">
              {figure}
            </p>

            {/* Caps at both ends, sentence case in the middle: the tablet frame
                is the only one that drops the caps and the mono face. */}
            <p className="font-mono text-[11px] tracking-[0.5px] text-[#7c8c84] uppercase md:font-sans md:text-xs md:tracking-normal md:normal-case lg:font-mono lg:text-[11px] lg:tracking-[1px] lg:text-[#6c8579] lg:uppercase">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
