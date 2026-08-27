import { Brand } from "../brand"

/**
 * The site footer.
 *
 * The links are placeholders — every `href` is `"#"`, so they stay on the page
 * rather than sending a visitor to a route that does not exist. That is the
 * deliberate difference from the nav links removed earlier: a dead `/docs`
 * returns a 404, which costs more trust than the link earns, whereas a
 * placeholder that goes nowhere is merely unfinished.
 *
 * Two things from the design are not here. The mobile frame's bottom bar
 * carried a `SOC 2 Type II` badge, which is the same certification claim
 * dropped from the capabilities grid — it is not held, and a footer badge is
 * exactly where someone would look to confirm it. And the columns lost
 * "CI gate", "Integrations" and "Benchmarks", which name features that do not
 * exist; the labels that replaced them point at things that do.
 *
 * Layout, from `breakpoints.ts`: a 2×2 grid of link columns below `lg:`, a
 * single row pushed right of the brand above it.
 */

type Column = { heading: string; links: string[] }

const COLUMNS: Column[] = [
  { heading: "PRODUCT", links: ["Scanning", "Ranking", "Claude analysis", "Triage board"] },
  { heading: "RESOURCES", links: ["Docs", "Changelog", "Status", "Support"] },
  { heading: "COMPANY", links: ["About", "Blog", "Careers", "Contact"] },
  { heading: "LEGAL", links: ["Privacy", "Terms", "Security", "DPA"] },
]

export function Footer() {
  return (
    <footer
      aria-label="Footer"
      className="w-full bg-[#050907] px-5 pt-11 pb-9 lg:px-[clamp(20px,4vw,56px)] lg:pt-11 lg:pb-10"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 lg:flex-row lg:gap-[60px]">
        <div className="flex flex-col gap-2.5 lg:w-[153px] lg:shrink-0 lg:gap-3.5">
          {/* The same lockup as the header and the landing nav, rather than the
              footer's own small radar mark — one definition of the brand. */}
          <Brand className="text-base" />

          <p className="text-[13px] leading-[1.6] text-[#8aa396]">
            Code debt has a half-life. We tell you which half is about to go off.
          </p>
        </div>

        {/* Pushes the columns to the right edge on desktop, as the design's
            explicit spacer element does. */}
        <div className="hidden lg:block lg:flex-1" />

        <nav
          aria-label="Footer links"
          className="grid grid-cols-2 gap-x-3 gap-y-7 lg:flex lg:gap-[60px]"
        >
          {COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-2 lg:gap-3">
              <h2 className="font-mono text-[10px] tracking-[1.5px] text-mint lg:text-[11px] lg:tracking-[1px] lg:text-[#4e6459]">
                {column.heading}
              </h2>

              {column.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="w-fit py-[5px] text-sm text-[#7c8c84] transition-colors hover:text-[#eaf6f0] lg:py-0 lg:text-[#7a9187]"
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* One bar at every width. The desktop frame tucks the copyright into the
          brand column instead, but that leaves it floating mid-footer once the
          columns are taller than the brand block, which they are. */}
      <div className="mx-auto mt-7 flex w-full max-w-[1120px] items-center pt-[18px]">
        <p className="font-mono text-[11px] text-[#3f5349]">© 2026 debtradar</p>
      </div>
    </footer>
  )
}
