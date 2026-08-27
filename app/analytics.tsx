"use client"

import { usePathname } from "next/navigation"
import Script from "next/script"
import { useEffect } from "react"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

/**
 * Route identity, with the customer's data taken out.
 *
 * `/repos/812734991/board` carries a real GitHub repository id, and sending it
 * to Google would put a list of which repositories our users own into somebody
 * else's system — a thing we never promised and would struggle to defend.
 * Collapsing the id to `[id]` keeps the report useful, because the question
 * worth answering is "do people reach the board?", never "whose board?".
 */
function redact(pathname: string): string {
  return pathname.replace(/\/\d+(?=\/|$)/g, "/[id]")
}

/**
 * Google Analytics, mounted for the whole site.
 *
 * Renders nothing at all when `NEXT_PUBLIC_GA_ID` is unset, which is what keeps
 * local development and preview deployments out of the production property.
 * Setting the variable is what turns this on; there is no other switch.
 *
 * Page views are sent by hand rather than automatically. GA4's built-in view
 * tracking fires on history changes and would report the raw URL — the exact
 * string `redact` exists to avoid — so `send_page_view` is off and every view
 * goes through the function above.
 */
export function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== "function") return
    window.gtag("event", "page_view", {
      page_path: redact(pathname),
      page_location: window.location.origin + redact(pathname),
    })
  }, [pathname])

  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      {/* The id is interpolated into script source, so it must come from the
          deployment rather than from anything a visitor controls — which is why
          it is read from the environment and never from a prop or a query. */}
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
