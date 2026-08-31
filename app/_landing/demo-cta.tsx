import Link from "next/link"
import { todoCounts } from "@/db/ranking"
import { DEMO_REPOSITORY_ID } from "@/lib/demo"
import { TrackClick } from "./track-click"

/**
 * The hero's second door: the product, visible without handing anything over.
 *
 * Named with the real count rather than "see the demo". "Demo" labels the thing
 * as a marketing artefact, which a developer audience skips; a number is
 * concrete, invites curiosity, and proves the scan works before the click
 * instead of promising to. It reads the same figure the demo page's own
 * headline does, so the button cannot promise something the page then contradicts.
 */
async function label(): Promise<string> {
  try {
    const counts = await todoCounts(DEMO_REPOSITORY_ID)
    // A repository with nothing in it would make a worse advertisement than no
    // number at all.
    if (counts.open > 0) return `See ${counts.open.toLocaleString("en-US")} TODOs in n8n`
  } catch {
    // Deliberately swallowed. This button is the entry point for every paid
    // click on the site, and a database hiccup must cost it its number, never
    // its existence.
  }
  return "See a real scan of n8n"
}

/**
 * A rotating conic sweep behind a one-pixel gap, so the border itself turns.
 *
 * `animate-radar-sweep` is the same keyframe the logo mark uses, which is the
 * point — the button reads as the same object as the brand rather than as a
 * button someone decorated. It animates `rotate` only, so it runs on the
 * compositor and never touches layout, and the global `prefers-reduced-motion`
 * rule in globals.css already stops it without this file asking.
 *
 * Kept deliberately dim. This is the *secondary* control, and an effect louder
 * than the primary call to action would invert the page's hierarchy while
 * pretending not to. If the demo should be the loud one, the honest fix is to
 * swap which button is primary.
 */
export async function DemoCta({ className }: { className: string }) {
  const text = await label()

  return (
    <TrackClick event="cta" placement="hero-demo">
      <span className="pointer-events-auto relative inline-block overflow-hidden rounded-[11px] p-px">
        <span
          aria-hidden="true"
          // Square and wider than the button so the rotation sweeps its corners
          // rather than orbiting a point inside it.
          className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,transparent_260deg,color-mix(in_srgb,var(--color-mint)_45%,transparent)_360deg)] opacity-60 motion-reduce:animate-none"
        />
        {/* The opaque middle. Without it the sweep shows through the whole
            face rather than the edge: GHOST's own fill is `bg-white/[.04]`,
            four percent of white, which hides nothing. Inset by the wrapper's
            single pixel of padding, so what remains visible is a ring. */}
        <span aria-hidden="true" className="absolute inset-px rounded-[10px] bg-[#0a1b22]" />
        <Link href="/demo" className={`relative ${className}`}>
          {text} →
        </Link>
      </span>
    </TrackClick>
  )
}
