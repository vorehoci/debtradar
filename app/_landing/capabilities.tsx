/**
 * The capabilities grid: six cards.
 *
 * Only one of the design's six survived intact. The rest described a different
 * product, and three were replaced outright with things that ship:
 *
 * - "Debt gates in CI" — no gate exists, and the same claim was already dropped
 *   from the pipeline section.
 * - "Debt over time" — no trends, no per-service or per-squad breakdown.
 * - "Self-host or SaaS" — there is no self-hosted deployment, and the card also
 *   claimed SOC 2 Type II. A certification claim is not marketing overreach; it
 *   is the kind of line that surfaces in a security questionnaire or a contract
 *   dispute, so it is gone rather than softened.
 *
 * Two more were corrected rather than replaced: "blast radius" and "dependent
 * count" are not ranking signals (nothing builds a dependency graph — the four
 * are age, file churn, author activity and marker severity), and the scanning
 * card claimed "14 languages" and "2,500 files in about four seconds". The
 * language table in `lib/comments.ts` maps 47 extensions across roughly 18
 * languages and formats, and nothing anywhere times a scan.
 *
 * The mobile frame proposed its own six, including a blast-radius graph, a CI
 * gate and Jira/Linear export. Same corrections, one shared list.
 *
 * Layout, from `breakpoints.ts`: wide icon-left cards in a stack below `lg:`,
 * a three-column grid of tall cards above it.
 */

type Feature = {
  title: string
  body: string
  icon: React.ReactNode
}

/** One stroke style for all six, so the set reads as a family. */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[19px] lg:size-[21px]"
    >
      {children}
    </svg>
  )
}

const FEATURES: Feature[] = [
  {
    title: "Full-tree scanning",
    body: "Every TODO, FIXME, HACK and XXX across 18 languages and formats. The first scan reads the whole tree; after that, only what changed.",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 12 19 7" />
      </Icon>
    ),
  },
  {
    title: "Risk-weighted ranking",
    body: "Age, file churn, author activity and marker severity fold into one 0–100 score you can actually sort by.",
    icon: (
      <Icon>
        <path d="M4 7h16M4 12h10M4 17h5" />
      </Icon>
    ),
  },
  {
    title: "Claude comment reads",
    body: "Semantic analysis of what the comment actually means, not just which keyword it matched.",
    icon: (
      <Icon>
        <path d="M12 3.5 13.4 8.2a3 3 0 0 0 2.4 2.4l4.7 1.4-4.7 1.4a3 3 0 0 0-2.4 2.4L12 20.5l-1.4-4.7a3 3 0 0 0-2.4-2.4L3.5 12l4.7-1.4a3 3 0 0 0 2.4-2.4Z" />
      </Icon>
    ),
  },
  {
    title: "Triage, not another backlog",
    body: "A board you work worst-first. Override a severity by hand, dismiss in bulk, and nothing gets filed in your tracker.",
    icon: (
      <Icon>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="9.5" y="4" width="5" height="11" rx="1" />
        <rect x="16" y="4" width="5" height="7" rx="1" />
      </Icon>
    ),
  },
  {
    title: "Every score explains itself",
    body: "Open any finding and see the four factors behind its number, and how many points each one contributed.",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4.5M12 8h.01" />
      </Icon>
    ),
  },
  {
    title: "It never changes your code",
    body: "Read access to code and metadata. The one thing debtradar writes is a neutral check on a pull request — it never edits a file, opens an issue, or leaves a comment.",
    icon: (
      <Icon>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </Icon>
    ),
  },
]

export function Capabilities() {
  return (
    <section
      aria-label="Capabilities"
      className="flex w-full flex-col items-center gap-7 px-5 py-[60px] lg:gap-10 lg:px-[clamp(20px,4vw,56px)] lg:pt-0 lg:pb-[90px]"
    >
      <div className="flex w-full max-w-[1120px] flex-col gap-2.5 lg:gap-3">
        <p className="font-mono text-[11px] tracking-[2px] text-mint lg:text-xs">
          {"// CAPABILITIES"}
        </p>

        <h2 className="text-[28px] leading-[1.15] font-bold text-[#e8f2ec] lg:text-[clamp(30px,3.6vw,46px)] lg:leading-[1.1] lg:text-[#eaf6f0]">
          Built for repos that got away from you.
        </h2>

        {/* Narrow frames only. The design's subline promised the tools "you
            already ship with" — that was the Jira, Linear and CI integration
            story, none of which exists. */}
        <p className="text-[15px] leading-[1.55] text-[#7c8c84] lg:hidden">
          Indexed, scored, and explained — so the four that matter surface before the four hundred
          that do not.
        </p>
      </div>

      <div className="flex w-full max-w-[1120px] flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-6">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-row items-center gap-3.5 rounded-xl border border-[#18241e] bg-[#0d1512] p-4 lg:min-w-[300px] lg:flex-1 lg:basis-[357px] lg:flex-col lg:items-start lg:gap-3.5 lg:rounded-[14px] lg:border-[#1a241f] lg:bg-[#0d1411] lg:p-[26px]"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#1e2b25] bg-[#070b09] text-mint lg:size-[42px] lg:border-0 lg:bg-[#12211b]">
              {feature.icon}
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:gap-3.5">
              <h3 className="text-[15px] font-medium text-[#e8f2ec] lg:text-xl lg:font-bold lg:text-[#eaf6f0]">
                {feature.title}
              </h3>

              <p className="text-[13px] leading-[1.5] text-[#7c8c84] lg:text-[15px] lg:leading-[1.6] lg:text-[#8aa396]">
                {feature.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
