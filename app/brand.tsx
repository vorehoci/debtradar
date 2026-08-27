/**
 * The debtradar brand lockup: a sweeping radar mark and the wordmark.
 *
 * Lives at the app root rather than under `_landing` because the landing page
 * and the signed-in header now show the same thing. It replaces the drawn SVG
 * wordmark that used to sit in the header — one mark, one definition.
 *
 * The accent comes from `--brand-accent`, not a hardcoded green. The brand
 * mint (#6dffc6) measures 15.8:1 on a dark surface and 1.25:1 on white, so on
 * the light theme it is invisible rather than merely low-contrast; the variable
 * resolves to a darker same-hue green there. See `app/globals.css`.
 */

/** The radar dial: a rim, a centre blip, and a sweep that never stops. */
function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-[26px] place-items-center rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--brand-accent)_55%,transparent)] shadow-[0_0_18px_color-mix(in_srgb,var(--brand-accent)_25%,transparent)]"
    >
      {/* The sweep, as a real element rather than a `::after`: a pseudo-element
          would need its gradient and animation declared in a stylesheet, which
          is the one thing this rewrite was meant to remove.

          Brightness rises with the angle and peaks at 360°, so the leading edge
          is solid and the glow trails behind it. It used to run the other way —
          accent at 0° fading to transparent — which, against a clockwise
          rotation, put the afterglow in front of the line and made the sweep
          look like it was travelling backwards. */}
      <span className="absolute inset-0.5 animate-radar-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_110deg,color-mix(in_srgb,var(--brand-accent)_55%,transparent)_360deg)] motion-reduce:animate-none" />
      <span className="size-1.5 rounded-full bg-[var(--brand-accent)] shadow-[0_0_10px_var(--brand-accent)]" />
    </span>
  )
}

export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center gap-[11px] text-[17px] font-bold tracking-[-0.02em] ${className ?? ""}`}
    >
      <BrandMark />
      <span>
        Debt<b className="font-bold text-[var(--brand-accent)]">Radar</b>
      </span>
    </span>
  )
}
