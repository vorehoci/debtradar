"use client"

import { Analytics as VercelAnalytics } from "@vercel/analytics/next"
import { redactUrl } from "@/lib/redact-url"

/**
 * Vercel Web Analytics, with the customer's data taken out of the URL first.
 *
 * A client component wrapping a client component, which looks redundant until
 * you try to remove it: `beforeSend` is a function, and a function cannot be
 * passed from the server-rendered root layout to a client component. This
 * boundary is where the callback can be created.
 *
 * The redaction is not optional decoration. The Next.js integration computes a
 * tidy `route` — `/repos/[id]/board` — but sends the raw `path` alongside it, so
 * grouping in the dashboard is not the same as never transmitting the id. See
 * `computeRoute` and `pageview` in the package: both values travel.
 */
export function Analytics() {
  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: redactUrl(event.url) })} />
}
