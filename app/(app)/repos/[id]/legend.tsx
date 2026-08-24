import { AnalysedMark } from "./analysed-mark"
import { DismissedChip } from "./dismissed-chip"
import { ManualMark } from "./manual-mark"

function Row({ mark, children }: { mark: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex w-16 shrink-0 justify-center">{mark}</span>
      <span className="text-[11px] text-neutral-600 dark:text-neutral-300">{children}</span>
    </li>
  )
}

/**
 * Explains the marks a card can carry.
 *
 * Collapsed by default and built from the real components rather than copies:
 * this is reference a person reads once, so it should not cost permanent space,
 * and it must not be able to disagree with the cards it describes.
 */
export function Legend() {
  return (
    <details className="group relative text-right">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-neutral-500 marker:content-[''] hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
        What do the icons mean?
        <span className="transition-transform group-open:rotate-90">›</span>
      </summary>

      {/* Absolute so opening the legend overlays the board rather than pushing
          it down — the columns must not jump when this is toggled. Needs its
          own opaque surface and shadow now that it floats over content. */}
      <ul className="absolute top-full right-0 z-20 mt-2 flex w-80 flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
        <Row mark={<AnalysedMark fixable={true} stale={false} />}>
          Claude has assessed whether this is fixable — open the card for the verdict
        </Row>
        <Row mark={<AnalysedMark fixable={true} stale={true} />}>
          Assessed, but the file has changed since — the verdict may be out of date
        </Row>
        <Row mark={<ManualMark by={null} at={null} />}>
          Someone set the severity by hand, overriding the score
        </Row>
        <Row mark={<DismissedChip />}>
          Answered “not a real TODO” — hidden unless you ask to see dismissed items
        </Row>
        <Row mark={<span className="text-[11px]">💬</span>}>
          Has comments; the number is how many
        </Row>
        <Row mark={<span className="text-[11px] tabular-nums text-neutral-400">74</span>}>
          Risk score out of 100, from age, churn, author activity and marker
        </Row>
      </ul>
    </details>
  )
}
