"use server"

import { db } from "@/db"
import { funnelEvents } from "@/db/schema"

/**
 * Names this will record, as an allow-list.
 *
 * The action is a public endpoint — anything on the internet can POST to it —
 * so the alternative is letting a stranger write arbitrary rows into the table
 * the funnel is read from. Two known names cost nothing to enumerate and make
 * the table impossible to fill with junk.
 */
const NAMES = new Set(["cta", "install-click"])
const PLACEMENTS = new Set([
  "hero-sign-in",
  "hero-demo",
  "nav-github-app",
  "get-started",
  "add-repositories",
  "demo-page",
  "demo-footer",
])

/**
 * Records that a call to action was pressed.
 *
 * Returns nothing and throws nothing. A funnel that can break a sign-in is
 * worse than a funnel with a gap in it, and the caller is a click handler on
 * the one page whose entire job is converting a visitor.
 */
export async function recordFunnelEvent(name: string, placement: string): Promise<void> {
  if (!NAMES.has(name) || !PLACEMENTS.has(placement)) return

  try {
    await db.insert(funnelEvents).values({ name, placement })
  } catch (error) {
    console.error("funnel: failed to record", error)
  }
}
