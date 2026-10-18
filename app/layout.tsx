import type { Metadata } from "next"
import { Archivo, JetBrains_Mono } from "next/font/google"
import { Analytics } from "./analytics"
import "./globals.css"

/**
 * The display and interface family.
 *
 * `axes: ["wdth"]` is the reason this face was chosen over a condensed static
 * cut. The width axis runs 62–125, so the headline can be set genuinely narrow
 * and the labels genuinely wide from one file, which is what the design system
 * asks for — a second family to get condensed display would cost another
 * download to say the same thing.
 *
 * Next only ships the weight axis unless the extra ones are named here, so
 * omitting `axes` would silently give a fixed-width font and every
 * `font-stretch` in the page would do nothing at all.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
})

// Self-hosted by next/font rather than the two <link> tags the design used:
// Google's stylesheet is a render-blocking round trip to a third party, and
// hosting the file removes both the request and the flash of fallback text.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

const DESCRIPTION =
  "Every repository has hundreds of TODOs. debtradar scores each one on how long it has sat " +
  "there, how hot the file around it runs, and whether the person who wrote it still works " +
  "here — so you triage the four that matter."

export const metadata: Metadata = {
  /**
   * Required for the rest of this object to work.
   *
   * Open Graph tags must carry absolute URLs — a crawler has no page to resolve
   * a relative one against. Without this, Next warns at build time and emits
   * localhost, which is invisible locally and produces a broken preview card
   * for everyone else.
   */
  metadataBase: new URL("https://debtradar.io"),

  title: {
    default: "debtradar",
    // Signed-in pages set their own titles; this is what frames them.
    template: "%s · debtradar",
  },
  description: DESCRIPTION,
  applicationName: "debtradar",

  openGraph: {
    type: "website",
    siteName: "debtradar",
    title: "debtradar — find the TODO that hurts",
    description: DESCRIPTION,
    url: "/",
    locale: "en",
    // og:image comes from app/opengraph-image.tsx by file convention — it is
    // generated from code at build time. Do not add an `images` key here: it
    // is silently ignored, the convention wins.
    //
    // og:image:alt is not emitted by this version of Next: neither the
    // documented .alt.txt sibling nor an explicit declaration produces the tag.
    // Both were tried and removed rather than left in place doing nothing.
  },

  twitter: {
    // X reads twitter:image when present and falls back to og:image otherwise,
    // so one card image serves every platform.
    card: "summary_large_image",
    title: "debtradar — find the TODO that hurts",
    description: DESCRIPTION,
  },

  // Only the landing page is meant to be indexed; app/robots.ts keeps crawlers
  // off the rest. This says what to do with the page they are allowed to read.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">
        {children}
        {/* Wrapped locally rather than imported straight from the package:
            the wrapper strips repository ids and search terms out of the URL
            before it is sent. See app/analytics.tsx.

            Vercel Web Analytics, replacing Google Analytics.

            Cookieless, so it needs no consent banner in the EU — which is the
            whole reason for the swap. It also costs nothing to keep honest:
            the Google version had to strip repository ids out of every path by
            hand, because `/repos/812734991/board` would otherwise have put a
            list of our users’ repositories into somebody else’s system. This
            component reads the Next.js route rather than the URL, so the
            report groups under `/repos/[id]/board` without being asked.

            Reporting only happens on Vercel; locally it is inert, so there is
            no environment variable gating it. */}
        <Analytics />
      </body>
    </html>
  )
}
