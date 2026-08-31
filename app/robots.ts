import type { MetadataRoute } from "next"

/**
 * What crawlers should bother with.
 *
 * The landing page and `/demo` are meant to be indexed — the demo is public by
 * design and is about a repository people search for. Everything under
 * `/dashboard` and `/repos` redirects a signed-out visitor to `/`, so a crawler
 * following one learns nothing and burns crawl budget arriving back where it
 * started. `/installed` is reachable but excluded by its own metadata: it is a
 * step inside a hand-off, and a page saying "you are all set" has no business
 * in a search result.
 *
 * This is not a security control and must never be mistaken for one. A
 * `Disallow` is a request that well-behaved crawlers honour; it stops nothing.
 * The reason those routes are safe is that every one of them checks the session
 * and redirects — see `currentRepositories`. Listing a path here that was not
 * already protected would advertise it rather than hide it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/repos/"],
    },
  }
}
