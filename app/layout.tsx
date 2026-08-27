import type { Metadata } from "next"
import { JetBrains_Mono, Space_Grotesk } from "next/font/google"
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

export const metadata: Metadata = {
  title: "debtradar",
  description: "TODOs ranked by how much they are likely to hurt.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">{children}</body>
    </html>
  )
}
