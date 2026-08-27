/**
 * How the three Spline frames map onto Tailwind's screens.
 *
 * The design file carries three frames — 390, 834 and 1280 — and they are not
 * one layout that reflows. The stat band alone changes from bordered cards to a
 * bare row, and its figures change colour between breakpoints. So each section
 * is written mobile-first with two overrides rather than as a single fluid
 * layout with guesses at where it should break.
 *
 *   frame            width    Tailwind        prefix
 *   mobile   390             < 768           (none — the base styles)
 *   tablet   834      768 … 1023             md:
 *   desktop  1280         >= 1024            lg:
 *
 * `lg:` rather than `xl:` for the desktop frame: a window between 1024 and 1279
 * has far more in common with the 1280 design than with an 834 tablet, and
 * leaving it on the tablet styles would strand the most common laptop widths on
 * the narrower layout.
 *
 * This file is documentation, not configuration — nothing imports the constant.
 * It exists so the prefixes scattered through the section components read as one
 * decision rather than as a series of independent guesses.
 */
export const FRAME_WIDTHS = { mobile: 390, tablet: 834, desktop: 1280 } as const
