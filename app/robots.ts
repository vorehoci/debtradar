import type { MetadataRoute } from "next"

/**
 * What crawlers should bother with.
 *
 * Only the landing page is meant to be indexed. Everything under `/dashboard`
 * and `/repos` redirects a signed-out visitor to `/`, so a crawler following
 * one learns nothing and burns crawl budget arriving back where it started.
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
