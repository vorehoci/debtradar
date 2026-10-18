/**
 * The capabilities section: six rows.
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
 * Layout: a specification list of six rows separated by hairline rules. It was
 * a six-card grid, which is the card scaffold the craft floor refuses; the
 * rows carry the same facts and stack to one column below `lg:`.
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
      className="flex w-full flex-col items-center gap-9 px-5 py-[60px] lg:gap-12 lg:px-[clamp(20px,4vw,56px)] lg:pt-0 lg:pb-[90px]"
    >
      <div className="flex w-full max-w-[1120px] flex-col gap-3">
        <h2 className="text-[clamp(28px,3.4vw,46px)] leading-[1.08] font-semibold tracking-[-.03em] [font-stretch:80%]">
          Built for repos that got away from you.
        </h2>

        {/* Narrow frames only. The design's subline promised the tools "you
            already ship with" — that was the Jira, Linear and CI integration
            story, none of which exists. */}
        <p className="max-w-[62ch] text-[15px] leading-[1.6] text-subtle lg:hidden">
          Indexed, scored, and explained — so the four that matter surface before the four hundred
          that do not.
        </p>
      </div>

      {/*
        A specification list, not a card grid.

        This shipped as six equal cards of icon-tile plus heading plus body,
        which is the craft floor's first refusal and the one section of the
        page that could have been lifted intact into any other product. Rules
        and a split row carry the same six facts with none of the scaffold, and
        the icons sit inline at text weight instead of in chips.
      */}
      <dl className="w-full max-w-[1120px] border-t border-edge">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="grid items-baseline gap-x-10 gap-y-2 border-b border-edge py-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:py-7"
          >
            <dt className="flex items-center gap-3 text-[17px] font-semibold tracking-[-.01em] text-ink lg:text-[19px]">
              <span className="shrink-0 text-lilac">{feature.icon}</span>
              {feature.title}
            </dt>

            <dd className="max-w-[68ch] text-[14.5px] leading-[1.65] text-subtle lg:text-[15.5px]">
              {feature.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
