/**
 * Marks a TODO that Claude has already assessed for fixability.
 *
 * Distinct from the green pencil, which records a person changing the band, and
 * from the "Found by Claude" filter, which is about how a TODO was discovered.
 * This one says only that the analysis has been run — so opening the panel will
 * show a verdict rather than a button.
 *
 * Violet ties it to the analysis controls in the panel; the pencil stays green
 * so the two never read as the same kind of fact.
 */
export function AnalysedMark({
  fixable,
  stale,
}: {
  fixable: boolean | null
  stale: boolean
}) {
  const verdict = fixable === null ? "analysed" : fixable ? "actionable" : "not actionable"
  const title = stale
    ? `Analysed by Claude (${verdict}) — the file has changed since`
    : `Analysed by Claude — ${verdict}`

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center ${
        // A stale verdict is still a verdict, but it should not look current.
        stale ? "text-neutral-400" : "text-violet-600 dark:text-violet-400"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M8 1.5 9.4 5.3a2 2 0 0 0 1.3 1.3L14.5 8l-3.8 1.4a2 2 0 0 0-1.3 1.3L8 14.5l-1.4-3.8a2 2 0 0 0-1.3-1.3L1.5 8l3.8-1.4a2 2 0 0 0 1.3-1.3L8 1.5Z" />
        <path d="M13 1.2 13.5 2.6 14.9 3.1 13.5 3.6 13 5 12.5 3.6 11.1 3.1 12.5 2.6 13 1.2Z" />
      </svg>
    </span>
  )
}
