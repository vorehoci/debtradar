/**
 * The 1px rule the tablet and mobile frames put between every section.
 *
 * Desktop has none — at 1280 the sections are far enough apart vertically to
 * separate themselves, where a narrow column runs them together. So this is
 * hidden from `lg:` up rather than being drawn everywhere.
 *
 * `aria-hidden` because it is a visual separator with no meaning: the sections
 * are already `<section>` elements with labels, so announcing a rule between
 * them would just add noise to a screen reader.
 */
export function Divider() {
  return <hr aria-hidden="true" className="h-px w-full border-0 bg-[#18241e] lg:hidden" />
}
