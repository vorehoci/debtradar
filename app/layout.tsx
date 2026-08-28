import type { Metadata } from "next"
import { JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "./analytics"
import "./globals.css"

/**
 * The interface family, replacing Inter across the whole site.
 *
 * Loaded as a variable font, which covers 300–700. It has no weight above 700,
 * so anything asking for 800 gets a synthesised bold rather than a real cut —
 * the hero headline is set to 700 for that reason.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
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
    // og:image comes from app/opengraph-image.png by file convention. Do not
    // add an `images` key here — it is silently ignored, the convention wins.
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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
