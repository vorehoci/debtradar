/**
 * The Claude analysis section: the pitch on one side, a sample verdict on the
 * other.
 *
 * The sample is shaped by what `lib/fix-analysis.ts` actually returns —
 * `fixable`, `scope` (`single-file` | `multi-file` | `needs-decision`),
 * `summary` and `confidence`. Both frames instead invented an effort estimate
 * ("EST. 3h FIX", "Estimated fix: ~3h") and a dependency count ("27 downstream
 * call sites"). Nothing in this product measures hours or builds a dependency
 * graph, and a verdict card is exactly where a visitor decides what the feature
 * returns — so the three facts shown are the three the model is asked for.
 *
 * The design's second bullet, "Clusters duplicate debt across services", went
 * the same way: there is no clustering or de-duplication anywhere.
 *
 * Layout, from `breakpoints.ts`: a stacked header and card below `lg:`, and a
 * bordered two-column panel above it.
 */

import { BandMark } from "@/app/_icons"

/** The three facts the model is actually asked for, as the card presents them. */
const VERDICT: [label: string, value: string, tone: string][] = [
  ["VERDICT", "ACTIONABLE", "text-band-critical"],
  ["SCOPE", "SINGLE-FILE", "text-band-high"],
  ["CONFIDENCE", "0.86", "text-lilac"],
]

const BULLETS = [
  "Infers real intent behind vague comments",
  "Reads the file around the line, not just the line",
  "Says whether it is actionable and how far the fix reaches",
]

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 17 17"
      className="size-[17px] shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M8.5 1.417A7.083 7.083 0 1 0 8.5 15.583 7.083 7.083 0 0 0 8.5 1.417Zm-1.417 10.625L3.541 8.5l.999-.999 2.543 2.536 5.376-5.376.999 1.006-6.375 6.375Z"
      />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 13 13"
      className="size-[13px] shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.833 1.083v2.167M11.916 2.167h-2.167M5.968 1.524a.553.553 0 0 1 1.065 0l.569 3.011c.083.438.425.78.863.863l3.011.569a.553.553 0 0 1 0 1.065l-3.011.569a1.11 1.11 0 0 0-.863.863l-.569 3.011a.553.553 0 0 1-1.065 0l-.569-3.011a1.11 1.11 0 0 0-.863-.863l-3.011-.569a.553.553 0 0 1 0-1.065l3.011-.569a1.11 1.11 0 0 0 .863-.863l.569-3.011Z"
        stroke="currentColor"
        strokeWidth="1.0833"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ClaudeAnalysis() {
  return (
    <section
      id="claude-analysis"
      aria-label="Claude analysis"
      className="scroll-mt-20 flex w-full flex-col items-center px-5 py-[60px] font-mono lg:px-[clamp(20px,4vw,56px)] lg:pt-0 lg:pb-[90px]"
    >
      {/* The panel is only a panel above `lg:`. Below it the fill, border and
          radius come off and this is just the column the two children stack in,
          which is what both narrow frames show. */}
      <div className="flex w-full max-w-[1120px] flex-col gap-7 lg:flex-row lg:items-center lg:gap-[60px] lg:rounded-[3px] lg:border lg:border-[#232745] lg:bg-[#13162b] lg:p-[46px]">
        {/* 458 and 510 are the design's two column widths; with the 60px gap
            they fill the 1028px inside the panel's padding exactly. Both need
            `min-w-0`, and the copy needs an explicit basis — without one it
            sizes to its content, takes 964px, and starves the card to 2px. */}
        <div className="flex flex-col gap-2.5 lg:min-w-0 lg:basis-[458px] lg:gap-[18px]">

          <h2 className="font-sans text-[clamp(28px,3.4vw,46px)] leading-[1.08] font-semibold tracking-[-.03em] text-ink [font-stretch:80%]">
            It reads the comment like a senior engineer would.
          </h2>

          <p className="text-[15px] leading-[1.55] text-[#7d8cb8] lg:leading-[1.6] lg:text-[#9fb0dd]">
            A regex knows a TODO exists. Claude knows the one that says “temporary” has been
            temporary for three years, that it guards a payment path, and that the author left the
            company.
          </p>

          {/* Bullets are a desktop-frame element; neither narrow frame has them,
              and the card below already carries the same three claims. */}
          <ul className="hidden flex-col gap-3 pt-1.5 lg:flex">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-center gap-2.5 text-sm text-[#bfd2ff]">
                <span className="text-lilac">
                  <CheckIcon />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-[3px] border border-[#232745] bg-[#13162b] p-[18px] lg:min-w-0 lg:grow lg:basis-[510px] lg:gap-0 lg:border-[#2e3357] lg:bg-[#13162b] lg:p-0">
          {/* Above `lg:` the desktop frame gives the card its own header strip;
              below it the same idea is a pill sitting inside the card body. */}
          <div className="hidden items-center gap-[9px] bg-[#1a1d3a] px-[18px] py-3.5 text-xs text-[#9fb0dd] lg:flex">
            <span className="text-lilac">
              <SparkleIcon />
            </span>
            claude · comment analysis
          </div>

          <div className="flex gap-3 rounded-[3px] bg-[#0b0d1a] p-3.5 lg:rounded-none lg:bg-[#0b0d1a] lg:p-[18px]">
            {/* The world's severity mark, not a coloured rule down the edge.
                A border-left above 1px on a callout is one of the craft
                floor's named refusals, and this page already has a diamond
                that means exactly this. */}
            <BandMark className="mt-1 shrink-0 bg-band-critical" />
            <p className="min-w-0 flex-1 text-xs leading-[1.5] break-words text-[#dce6ff] lg:text-[13px] lg:leading-[1.6] lg:text-[#bfd2ff]">
              {"// TODO: signature validation disabled for staging — DO NOT SHIP"}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:gap-3.5 lg:px-[18px] lg:py-5">
            <span className="flex w-fit items-center gap-2 rounded-[3px] border border-[#6a6cf6] bg-[#1a1d3a] px-2.5 py-1.5 text-[11px] tracking-[0.5px] text-lilac lg:hidden">
              <SparkleIcon />
              Claude-powered analysis
            </span>

            <p className="font-sans text-[15px] leading-[1.55] text-[#dce6ff] lg:text-sm lg:leading-[1.65] lg:text-[#bfd2ff]">
              Signature validation is disabled on a production auth path — requests are accepted
              unverified whenever the staging flag leaks into a release build.
            </p>

            {/* The second paragraph loses the frames' "27 downstream call sites"
                and "Estimated fix: ~3h". What is left — age and an inactive
                author — are two of the four signals the ranker really computes. */}
            <p className="font-sans text-[15px] leading-[1.55] text-[#7d8cb8] lg:text-sm lg:leading-[1.65]">
              It was added for a demo two years ago, and the author&apos;s last commit was fourteen
              months back, so there is nobody left to ask.
            </p>

            {/* Labelled boxes at every width, rather than the desktop frame's
                bare pills. The pills read EXPLOITABLE / ORPHANED OWNER / EST. 3h
                FIX — none of which survives — and once the values are the real
                ones, "SINGLE-FILE" and "0.86" mean nothing without their label. */}
            <div className="flex flex-wrap gap-2">
              {VERDICT.map(([label, value, tone]) => (
                <div
                  key={label}
                  className="flex flex-1 flex-col gap-1 rounded-[3px] border border-[#232745] bg-[#0b0d1a] p-2.5"
                >
                  <p className="text-[11px] tracking-[1px] text-[#7d8cb8]">{label}</p>
                  <p className={`text-xs ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
