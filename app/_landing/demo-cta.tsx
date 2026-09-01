import Link from "next/link"
import { todoCounts } from "@/db/ranking"
import { DEMO_REPOSITORY_ID } from "@/lib/demo"
import { TrackClick } from "./track-click"

/**
 * The hero's main call to action: the product, visible without handing anything
 * over.
 *
 * Named with the real count rather than "see the demo". "Demo" labels the thing
 * as a marketing artefact, which a developer audience skips; a number is
 * concrete, invites curiosity, and proves the scan works before the click
 * instead of promising to. It reads the same figure the demo page's own
 * headline does, so the button cannot promise something the page then
 * contradicts.
 *
 * It carried a rotating radar sweep on its border while it was the secondary
 * control, to stop it disappearing next to the primary. That is gone: the sweep
 * was compensating for the hierarchy being wrong, and the hierarchy is now
 * right. A mint sweep around a mint button would also have been invisible.
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

export async function DemoCta({ className }: { className: string }) {
  const text = await label()

  return (
    <TrackClick event="cta" placement="hero-demo">
      <Link href="/demo" className={`pointer-events-auto inline-block ${className}`}>
        {text} →
      </Link>
    </TrackClick>
  )
}
