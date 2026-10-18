/**
 * The drawn icon set.
 *
 * Small, but it exists for one reason: a unicode arrow is whatever glyph the
 * resolved font happens to carry, at whatever weight and baseline that font
 * chose, and the page shipped `→` on its most prominent control sitting beside
 * a drawn SVG arrow in the same row — two different arrows, one line apart.
 *
 * Everything here is one stroke weight (1.75 at 24px) with square caps, which
 * is the world's own line quality.
 */

type IconProps = {
  /** Extra classes; `size-*` is expected to come from the caller. */
  className?: string
}

/**
 * `group-hover:translate-x-1` is baked in rather than left to callers: every
 * control that carries this arrow is a `group`, and the nudge is part of the
 * affordance rather than a per-site decoration.
 */
export function Arrow({ className = "size-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} transition-transform duration-200 group-hover:translate-x-1`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

/**
 * Disclosure. Replaces `›`, which is a quotation mark doing an icon's job and
 * sits on the text baseline rather than centred on the row.
 */
export function Chevron({ className = "size-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** Confirmation. Replaces `✓`, which rendered at a different weight to everything around it. */
export function Check({ className = "size-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
    >
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  )
}

/**
 * A severity mark, drawn as the world's rotated square rather than the `■`
 * glyph. Colour comes from the caller via `bg-band-*`, and the band is always
 * written out beside it — colour alone never carries the meaning.
 */
export function BandMark({ className = "" }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 rotate-45 align-middle ${className}`}
    />
  )
}
