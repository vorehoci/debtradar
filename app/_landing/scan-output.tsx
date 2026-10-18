/**
 * The scan output section: a heading and a mock terminal.
 *
 * The terminal's contents are illustrative — invented findings in an invented
 * repository, the way a product screenshot is, and the section now says so on
 * screen.
 *
 * It used to carry no label, on the reasoning that it read as a mockup rather
 * than a measurement. That held while nothing else on the page carried
 * numbers. It stopped holding when the hero and the ranked section above
 * started showing a real n8n scan: two sections down, an unlabelled
 * "2,481 files parsed" reads as a second measurement.
 *
 * What it must not do is teach vocabulary the product does not use, so the
 * severities here are the real `BANDS` from `lib/describe.ts` rather than the
 * design's critical/elevated/background, and the per-finding signals are ones
 * the ranker actually computes. The design showed "34 dependents"; nothing in
 * this codebase builds a dependency graph, so the rows show author activity
 * instead — which is the signal the whole product is built around.
 *
 * The chips are the classifier's own `CATEGORIES` from `lib/classify.ts`, for
 * the same reason: the design's SECURITY / CONCURRENCY / DEAD CODE / SCALE /
 * COSMETIC are a taxonomy nothing in this product emits, so a visitor would
 * arrive at their first board looking for labels that do not exist.
 */

import { BandMark, Check } from "@/app/_icons"

type Band = "critical" | "high" | "low"

/**
 * The classifier's categories, spelled for display.
 *
 * Keyed by the literal values in `CATEGORIES`, so if that list changes this
 * stops compiling rather than quietly showing a label the product retired.
 */
const CATEGORY_LABELS = {
  "hidden-todo": "HIDDEN TODO",
  "hack-workaround": "HACK / WORKAROUND",
  "deferred-decision": "DEFERRED DECISION",
  "not-actionable": "NOT ACTIONABLE",
} as const

type Category = keyof typeof CATEGORY_LABELS

type Finding = {
  comment: string
  location: string
  /** Age and author activity — two of the four real ranking signals. */
  signals: string
  category: Category
  score: number
  band: Band
}

/**
 * Per-band styling, so a band name is the only thing a finding has to declare.
 *
 * `capsule` and `fill` belong to the card layout only. The mobile frame gives
 * low findings a mint capsule where the desktop rows render them in grey — a
 * deliberate difference in the design, not an oversight, so both are kept.
 */
const BAND_STYLES: Record<
  Band,
  { bar: string; score: string; chip: string; comment: string; capsule: string; fill: string }
> = {
  critical: {
    bar: "bg-band-critical",
    score: "text-band-critical",
    chip: "bg-[#2e1410] text-band-critical",
    comment: "text-[#dce6ff]",
    capsule: "border-band-critical bg-[#2a110c] text-band-critical",
    fill: "bg-band-critical",
  },
  high: {
    bar: "bg-band-high",
    score: "text-band-high",
    chip: "bg-[#241233] text-band-high",
    comment: "text-[#dce6ff]",
    capsule: "border-band-high bg-[#2a1340] text-band-high",
    fill: "bg-band-high",
  },
  low: {
    bar: "bg-band-low",
    score: "text-[#7d8cb8]",
    chip: "bg-[#1a1d3a] text-[#7d8cb8]",
    // Dimmer than the rest: a row nobody needs to read should not compete with
    // the two above it for attention.
    comment: "text-[#9fb0dd]",
    capsule: "border-[#6a6cf6] bg-[#1a1d3a] text-lilac",
    fill: "bg-lilac",
  },
}

const FINDINGS: Finding[] = [
  {
    comment: "// TODO: remove this before we ever touch prod auth",
    location: "services/auth/session.ts:214",
    signals: "untouched 891d · author gone 2y",
    category: "deferred-decision",
    score: 98,
    band: "critical",
  },
  {
    comment: "// FIXME: race condition, patched with a sleep(200) lol",
    location: "workers/queue/dispatch.go:77",
    signals: "untouched 402d · 31 commits/yr",
    category: "hack-workaround",
    score: 94,
    band: "critical",
  },
  {
    comment: "// HACK: duplicate of the v1 parser, delete when v2 ships",
    location: "packages/parser/legacy.ts:12",
    signals: "untouched 233d · author gone 8mo",
    category: "hack-workaround",
    score: 71,
    band: "high",
  },
  {
    // Deliberately unmarked: this row is the one that shows what the Claude
    // scan adds, so it has to be a comment the regex pass would never catch.
    comment: "// pagination here breaks past 10k rows, needs keyset",
    location: "api/handlers/list.py:56",
    signals: "untouched 128d · 14 commits/yr",
    category: "hidden-todo",
    score: 63,
    band: "high",
  },
  {
    comment: "// NOTE: rename this variable someday",
    location: "ui/components/Chart.tsx:9",
    signals: "untouched 41d · 1 commit/yr",
    category: "not-actionable",
    score: 12,
    band: "low",
  },
]

/**
 * The window-chrome dots, in the design's order.
 *
 * Both classes are written out in full rather than composed at runtime. Tailwind
 * finds classes by scanning source text, so a name built with a template literal
 * — `lg:${dot}` — is invisible to it and the rule is simply never generated.
 */
const DOTS = [
  "bg-band-critical lg:bg-band-critical",
  "bg-[#232745] lg:bg-band-high",
  "bg-[#232745] lg:bg-lilac",
] as const

/**
 * A finding as the mobile and tablet frames draw it: a bordered card with the
 * severity stated in words, the score pulled right, and a fill bar along the
 * bottom.
 *
 * This is a different component rather than the row with responsive classes on
 * it. The two layouts share no structure — the row puts a vertical severity bar
 * first and the score last on one line, the card leads with a capsule and ends
 * with a horizontal bar — so expressing both in one tree would mean a set of
 * elements that reorder and change meaning at a breakpoint.
 */
function Card({ finding, index }: { finding: Finding; index: number }) {
  const style = BAND_STYLES[finding.band]

  return (
    <div className="flex flex-col gap-[9px] rounded-[3px] border border-[#232745] bg-[#13162b] p-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#7d8cb8]">{String(index + 1).padStart(2, "0")}</span>

        <span
          className={`rounded border px-2 py-[3px] text-[11px] tracking-[1px] uppercase ${style.capsule}`}
        >
          {finding.band}
        </span>

        <span className={`ml-auto font-sans text-2xl leading-none font-bold ${style.score}`}>
          {finding.score}
        </span>
      </div>

      <p className="text-xs leading-[1.5] break-words text-[#dce6ff]">{finding.comment}</p>
      <p className="text-[11px] break-words text-[#7d8cb8]">{finding.location}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[#7d8cb8]">{finding.signals}</span>
        <span className="rounded border border-[#2e3357] bg-[#0b0d1a] px-[7px] py-0.5 text-[11px]">
          <span className={style.score}>{CATEGORY_LABELS[finding.category]}</span>
        </span>
      </div>

      {/* The bar is the score, so it is drawn from the score rather than from a
          hardcoded width as the design's export had it. */}
      <div aria-hidden="true" className="h-[3px] w-full rounded-[2px] bg-[#232745]">
        <div className={`h-full rounded-[2px] ${style.fill}`} style={{ width: `${finding.score}%` }} />
      </div>
    </div>
  )
}

function Row({ finding }: { finding: Finding }) {
  const style = BAND_STYLES[finding.band]

  return (
    <div className="flex items-center gap-[18px] px-[22px] py-4 max-md:flex-wrap">
      {/* The severity diamond, not a coloured rule. Same refusal the verdict
          callout hit: a colour bar wider than a hairline down the edge of a
          list item is on the craft floor's list, and this world already owns a
          mark that means exactly this. */}
      <BandMark className={`shrink-0 ${style.bar}`} />

      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        {/* `break-words` because these are file paths and comment text: a long
            one would otherwise push the chip and score off the card. */}
        <p className={`text-sm break-words ${style.comment}`}>{finding.comment}</p>
        <p className="text-xs break-words text-[#7d8cb8]">
          {finding.location} · {finding.signals}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-[3px] px-[9px] py-1 text-[11px] leading-[13px] ${style.chip}`}
      >
        {CATEGORY_LABELS[finding.category]}
      </span>

      <div className="flex shrink-0 flex-col items-end gap-[3px]">
        <p className={`font-sans text-[19px] leading-none font-bold ${style.score}`}>
          {finding.score}
        </p>
        <p className="text-[11px] text-[#727da3]">RISK</p>
      </div>
    </div>
  )
}

export function ScanOutput() {
  return (
    <section
      aria-label="Scan output"
      className="flex w-full flex-col items-center gap-7 px-5 py-[60px] font-mono lg:gap-[34px] lg:px-[clamp(20px,4vw,56px)] lg:pt-[70px] lg:pb-[90px]"
    >
      <div className="flex w-full max-w-[1120px] flex-col gap-2.5 lg:gap-3.5">

        {/*
          One headline at every width, sized down rather than swapped. The mobile
          frame proposes a different line — "Ranked, not listed." — but two
          headlines means two places to keep the same claim true, and every copy
          correction agreed so far would have had to be made twice.
        */}
        <h2 className="font-sans text-[28px] leading-[1.15] font-bold text-[#dce6ff] lg:text-[clamp(30px,3.6vw,46px)] lg:leading-[1.1] lg:text-[#dce6ff]">
          Every TODO, ranked by what it will cost you.
        </h2>

        {/*
          Two corrections to the design's copy. It claimed 14 languages, where
          `lib/comments.ts` maps 46 extensions across roughly thirty languages
          and formats. And it listed "blast radius" as a scoring signal — there
          is no dependency graph anywhere in this product; the fourth signal is
          the marker itself, since FIXME concedes something is broken where TODO
          is often just a note.
        */}
        <p className="max-w-[620px] text-[15px] leading-[1.55] text-[#7d8cb8] lg:leading-[1.6] lg:text-[#9fb0dd]">
          DebtRadar walks your tree, parses comments in 30+ languages, and scores each finding on
          staleness, churn, author activity and marker severity.
        </p>

        {/*
          On screen, not only in a source comment.

          The terminal below is an illustration with an invented repository in
          it. That was defensible when nothing else on the page carried numbers;
          it is not now that the hero and the ranked section above both show a
          real n8n scan, because a visitor two sections down reads this as a
          second measurement rather than as a drawing.
        */}
        <p className="text-[11px] tracking-[.2em] text-faint uppercase">
          Illustration — invented repository, real scoring signals
        </p>
      </div>

      <div className="w-full max-w-[1120px] overflow-hidden rounded-[3px] border border-[#232745] bg-[#13162b] lg:border-[#232745] lg:bg-[#13162b] lg:shadow-[0_30px_80px_0_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-[7px] bg-[#1a1d3a] px-3.5 py-3 lg:gap-2.5 lg:bg-[#1a1d3a] lg:px-[18px] lg:py-3.5">
          {/* Only the first dot is lit below `lg:` — the mobile frame greys the
              other two out rather than showing the full traffic light. */}
          {DOTS.map((dot) => (
            <span
              key={dot}
              aria-hidden="true"
              className={`size-[9px] rounded-full lg:size-[11px] ${dot}`}
            />
          ))}
          {/*
            Not a command. The design's title bar read
            `debtradar scan ./monorepo --rank --claude`, which invents a CLI —
            there isn't one, and there is no flag to pass: debtradar is a GitHub
            App and a scan is triggered by a push to the default branch. So the
            bar names what was scanned and what triggered it, which is what the
            window is actually showing.
          */}
          {/* The mobile frame right-aligns a `bash — 80×24` title here and puts
              `$ debtradar scan ./monorepo --rank` in the body. Both invent a CLI,
              so the same real line is used at every width — a repository, a
              trigger and a commit — right-aligned below `lg:` as the frame has
              it, left-aligned beside the dots above it. */}
          <p className="ml-auto text-[11px] tracking-[1px] text-[#7d8cb8] lg:ml-0 lg:pl-2.5 lg:text-[13px] lg:tracking-normal lg:text-[#7d8cb8]">
            acme/monorepo · push to main · a1b2c3d
          </p>
        </div>

        {/* The design's three counts, relabelled to the app's own bands. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 pt-3.5 text-[11px] lg:gap-x-[26px] lg:gap-y-2 lg:bg-[#13162b] lg:px-[22px] lg:py-[18px] lg:text-[13px]">
          {/* No duration. Nothing measures one, and a seed walks a whole
              repository tarball through a queued job — minutes, not seconds —
              so any figure here would have been wrong by orders of magnitude. */}
          <p className="flex items-center gap-2 text-lilac">
            <Check className="size-3.5" />
            2,481 files parsed
          </p>
          <p className="flex items-center gap-2 text-band-critical">
            <BandMark className="bg-band-critical" />
            27 critical
          </p>
          <p className="flex items-center gap-2 text-band-high">
            <BandMark className="bg-band-high" />
            114 high
          </p>
          <p className="flex items-center gap-2 text-[#7d8cb8]">
            <BandMark className="bg-band-low" />
            632 low
          </p>
        </div>

        {/* Cards below `lg:`, rows above it. Both are rendered and one is
            hidden, rather than branching on a matchMedia hook: this section is a
            server component and reading the viewport would push the whole thing
            into the client bundle to choose between two static layouts. */}
        <div className="flex flex-col gap-2.5 p-3.5 lg:hidden">
          {FINDINGS.map((finding, index) => (
            <Card key={finding.location} finding={finding} index={index} />
          ))}
        </div>

        <div className="hidden lg:block">
          {FINDINGS.map((finding) => (
            <Row key={finding.location} finding={finding} />
          ))}
        </div>
      </div>
    </section>
  )
}
