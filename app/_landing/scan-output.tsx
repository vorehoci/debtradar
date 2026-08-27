/**
 * The scan output section: a heading and a mock terminal.
 *
 * The terminal's contents are illustrative — invented findings in an invented
 * repository, the way a product screenshot is. That is deliberate and reads as
 * a mockup rather than a measurement, which is why it is not hedged.
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
    bar: "bg-signal",
    score: "text-signal",
    chip: "bg-[#2a1119] text-signal",
    comment: "text-[#eaf6f0]",
    capsule: "border-signal bg-[#2a0a14] text-signal",
    fill: "bg-signal",
  },
  high: {
    bar: "bg-caution",
    score: "text-caution",
    chip: "bg-[#2a2211] text-caution",
    comment: "text-[#eaf6f0]",
    capsule: "border-caution bg-[#2a1c05] text-caution",
    fill: "bg-caution",
  },
  low: {
    bar: "bg-[#2e4a3c]",
    score: "text-[#6c8579]",
    chip: "bg-[#16211c] text-[#6c8579]",
    // Dimmer than the rest: a row nobody needs to read should not compete with
    // the two above it for attention.
    comment: "text-[#a9c0b5]",
    capsule: "border-[#2c5f4a] bg-[#0a1c15] text-mint",
    fill: "bg-mint",
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
  "bg-signal lg:bg-signal",
  "bg-[#24382f] lg:bg-caution",
  "bg-[#24382f] lg:bg-mint",
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
    <div className="flex flex-col gap-[9px] rounded-[10px] border border-[#18241e] bg-[#0d1512] p-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#7c8c84]">{String(index + 1).padStart(2, "0")}</span>

        <span
          className={`rounded border px-2 py-[3px] text-[10px] tracking-[1px] uppercase ${style.capsule}`}
        >
          {finding.band}
        </span>

        <span className={`ml-auto font-sans text-2xl leading-none font-bold ${style.score}`}>
          {finding.score}
        </span>
      </div>

      <p className="text-xs leading-[1.5] break-words text-[#e8f2ec]">{finding.comment}</p>
      <p className="text-[11px] break-words text-[#7c8c84]">{finding.location}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[#7c8c84]">{finding.signals}</span>
        <span className="rounded border border-[#1e2b25] bg-[#070b09] px-[7px] py-0.5 text-[10px]">
          <span className={style.score}>{CATEGORY_LABELS[finding.category]}</span>
        </span>
      </div>

      {/* The bar is the score, so it is drawn from the score rather than from a
          hardcoded width as the design's export had it. */}
      <div aria-hidden="true" className="h-[3px] w-full rounded-sm bg-[#18241e]">
        <div className={`h-full rounded-sm ${style.fill}`} style={{ width: `${finding.score}%` }} />
      </div>
    </div>
  )
}

function Row({ finding }: { finding: Finding }) {
  const style = BAND_STYLES[finding.band]

  return (
    <div className="flex items-center gap-[18px] px-[22px] py-4 max-md:flex-wrap">
      <span aria-hidden="true" className={`h-[42px] w-[3.3px] shrink-0 rounded-sm ${style.bar}`} />

      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        {/* `break-words` because these are file paths and comment text: a long
            one would otherwise push the chip and score off the card. */}
        <p className={`text-sm break-words ${style.comment}`}>{finding.comment}</p>
        <p className="text-xs break-words text-[#6c8579]">
          {finding.location} · {finding.signals}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-[5px] px-[9px] py-1 text-[11px] leading-[13px] ${style.chip}`}
      >
        {CATEGORY_LABELS[finding.category]}
      </span>

      <div className="flex shrink-0 flex-col items-end gap-[3px]">
        <p className={`font-sans text-[22px] leading-none font-bold ${style.score}`}>
          {finding.score}
        </p>
        <p className="text-[10px] text-[#4e6459]">RISK</p>
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
        {/* Braced string, not a bare text node: `// THE RADAR` in JSX reads as
            a stray comment to the linter and to anyone skimming the file. */}
        <p className="text-[11px] tracking-[2px] text-mint lg:text-xs">{"// THE RADAR"}</p>

        {/*
          One headline at every width, sized down rather than swapped. The mobile
          frame proposes a different line — "Ranked, not listed." — but two
          headlines means two places to keep the same claim true, and every copy
          correction agreed so far would have had to be made twice.
        */}
        <h2 className="font-sans text-[28px] leading-[1.15] font-bold text-[#e8f2ec] lg:text-[clamp(30px,3.6vw,46px)] lg:leading-[1.1] lg:text-[#eaf6f0]">
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
        <p className="max-w-[620px] text-[15px] leading-[1.55] text-[#7c8c84] lg:leading-[1.6] lg:text-[#8aa396]">
          DebtRadar walks your tree, parses comments in 30+ languages, and scores each finding on
          staleness, churn, author activity and marker severity.
        </p>
      </div>

      <div className="w-full max-w-[1120px] overflow-hidden rounded-[14px] border border-[#18241e] bg-[#0d1512] lg:border-[#1e2a24] lg:bg-[#0b120f] lg:shadow-[0_30px_80px_0_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-[7px] bg-[#0a110e] px-3.5 py-3 lg:gap-2.5 lg:bg-[#101915] lg:px-[18px] lg:py-3.5">
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
          <p className="ml-auto text-[10px] tracking-[1px] text-[#7c8c84] lg:ml-0 lg:pl-2.5 lg:text-[13px] lg:tracking-normal lg:text-[#6c8579]">
            acme/monorepo · push to main · a1b2c3d
          </p>
        </div>

        {/* The design's three counts, relabelled to the app's own bands. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 pt-3.5 text-[11px] lg:gap-x-[26px] lg:gap-y-2 lg:bg-[#0e1712] lg:px-[22px] lg:py-[18px] lg:text-[13px]">
          {/* No duration. Nothing measures one, and a seed walks a whole
              repository tarball through a queued job — minutes, not seconds —
              so any figure here would have been wrong by orders of magnitude. */}
          <p className="text-mint">✓ 2,481 files parsed</p>
          <p className="text-signal">■ 27 critical</p>
          <p className="text-caution">■ 114 high</p>
          <p className="text-[#6c8579]">■ 632 low</p>
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
