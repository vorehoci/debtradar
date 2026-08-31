/**
 * Marks a finding that carried no marker and was found by Claude reading it.
 *
 * These are the ones nobody labelled — no `TODO`, no `FIXME` — so the regex
 * pass walked straight past them and only the deep scan turned them up. On
 * n8n that is 227 findings out of 792, and until now the only way to see which
 * ones they were was the "Found by Claude" filter, which shows them by hiding
 * everything else. The mark says it per card, so provenance survives when the
 * filter is off.
 *
 * Violet, matching `AnalysedMark`, because both facts are "Claude did this" and
 * a second hue would imply a second kind of thing. The glyphs carry the
 * difference and are deliberately unalike: a magnifier for something *found*, a
 * sparkle for something *assessed*. A card can legitimately show both.
 *
 * Not a client component, for the same reason as the others — no interactivity,
 * and both the board and the list need it.
 */
export function FoundMark({ category }: { category: string }) {
  // "hack-workaround" reads badly in a tooltip; the stored value is a slug.
  const kind = category.replace(/-/g, " ")
  const title = `Found by Claude — no marker on this comment (${kind})`

  return (
    <span title={title} aria-label={title} className="inline-flex items-center text-violet-400">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.6 1.2a5.4 5.4 0 1 0 3.1 9.82l3.1 3.1a.9.9 0 0 0 1.28-1.27l-3.1-3.1A5.4 5.4 0 0 0 6.6 1.2Zm0 1.8a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z"
        />
      </svg>
    </span>
  )
}
