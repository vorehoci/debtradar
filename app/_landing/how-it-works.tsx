/**
 * The pipeline section: three numbered steps.
 *
 * Step 02 is close to the design's own words, because the design got that one
 * right — the markers, git blame, file churn and the 0–100 score are all real.
 * The other two were rewritten against what actually ships, and every frame
 * re-proposes the same rejected claims, so the copy lives here once and only
 * the layout changes between breakpoints:
 *
 * - "Read-only GitHub/GitLab app, no code leaves your VPC." There is no
 *   self-hosted deployment, and the Claude scan sends comment text to the
 *   Anthropic API, so that sentence is false in both directions — the kind of
 *   claim a security review quotes back.
 * - "Export to Jira/Linear or gate the PR directly in CI." None of it exists,
 *   and it argues against the product: the stat band one section up says zero
 *   issues filed, and the whole premise is that a tracker full of TODOs is a
 *   tracker nobody reads.
 * - "ranked in seconds". Nothing times a scan, and a seed walks a whole
 *   repository tarball through a queued job.
 *
 * Layout, from `breakpoints.ts`: bordered cards in a stack below `lg:`, three
 * bare columns above it. The step number is a plain mint numeral on a card and
 * a filled mint disc in the column layout.
 */

type Step = {
  number: string
  title: string
  body: React.ReactNode
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Connect the repo",
    body: (
      <>
        Install the GitHub App on the repositories you pick. It reads code and metadata, and the
        only thing it writes back is a neutral check on your pull requests.{" "}
        <span className="text-[#6c8579]">GitLab is planned.</span>
      </>
    ),
  },
  {
    number: "02",
    title: "Scan & score",
    body: "Every TODO, FIXME, HACK and XXX gets parsed, cross-referenced with git blame and file churn, then scored 0–100.",
  },
  {
    number: "03",
    title: "Triage the queue",
    body: "Work the board worst-first. Move a severity by hand, ask Claude whether a finding is really actionable, or dismiss it. Nothing gets filed in your tracker.",
  },
]

export function HowItWorks() {
  return (
    <section
      aria-label="How it works"
      className="flex w-full flex-col items-center gap-7 px-5 py-[60px] lg:gap-10 lg:px-[clamp(20px,4vw,56px)] lg:pt-5 lg:pb-[90px]"
    >
      <div className="flex w-full max-w-[1120px] flex-col gap-2.5 lg:gap-3">
        {/* Braced string: a bare `// PIPELINE` text node reads as a stray
            comment to the linter and to anyone skimming the file. */}
        <p className="font-mono text-[11px] tracking-[2px] text-mint lg:text-xs">{"// PIPELINE"}</p>

        {/* "Three steps", not the design's "Three commands" — there is no CLI to
            type anything into. */}
        <h2 className="text-[28px] leading-[1.15] font-bold text-[#e8f2ec] lg:text-[clamp(30px,3.6vw,46px)] lg:leading-[1.1] lg:text-[#eaf6f0]">
          Three steps from blind spot to backlog.
        </h2>

        {/* Only the narrow frames carry a subline, and the design's — "No agents
            to babysit, no code to upload" — is the VPC claim in shorter words.
            This says what is actually true of a webhook-driven scan. */}
        <p className="text-[15px] leading-[1.55] text-[#7c8c84] lg:hidden">
          Install once. Every push re-scans and re-ranks — there is nothing to run yourself.
        </p>
      </div>

      <div className="flex w-full max-w-[1120px] flex-col gap-3 lg:flex-row lg:flex-wrap lg:gap-11">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="flex flex-row gap-3.5 rounded-[14px] border border-[#18241e] bg-[#0d1512] px-4 py-[18px] lg:min-w-[280px] lg:flex-1 lg:flex-col lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
          >
            {/* One element, two treatments: a bare mint numeral on the card, a
                filled mint disc with a dark numeral in the column layout. */}
            <span className="shrink-0 font-mono text-[13px] text-mint lg:flex lg:size-[30px] lg:items-center lg:justify-center lg:rounded-full lg:bg-mint lg:font-sans lg:font-bold lg:text-[#070b09]">
              {step.number}
            </span>

            <div className="flex min-w-0 flex-col gap-1.5 lg:gap-4">
              <h3 className="text-base font-medium text-[#e8f2ec] lg:text-xl lg:font-bold lg:text-[#eaf6f0]">
                {step.title}
              </h3>

              <p className="text-[15px] leading-[1.55] text-[#7c8c84] lg:leading-[1.6] lg:text-[#8aa396]">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
