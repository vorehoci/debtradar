import { Brand } from "../brand"

/**
 * The site footer.
 *
 * It used to carry sixteen links in four columns, every one of them
 * `href="#"`. That was defensible while the page was a private draft — a
 * placeholder that goes nowhere is merely unfinished, where a dead `/docs`
 * returns a 404 — but it stops being defensible the moment strangers can
 * arrive. A visitor who clicks three links and lands nowhere has learned
 * something true about how finished the product is, and it is not the
 * impression the rest of the page is working for.
 *
 * So the columns are gone and what is left is the four destinations that
 * exist. A short honest row reads as a small product; a wall of dead links
 * reads as an abandoned one.
 *
 * What the removed labels were promising, for whoever restores them: `Docs`,
 * `Changelog`, `Status`, `Blog`, `About` and `Careers` need pages that have
 * never been written. `Privacy`, `Terms`, `Security` and `DPA` need documents
 * that need a lawyer — and are the ones worth adding first, because a service
 * that reads private source code is exactly the kind a cautious buyer checks
 * for them.
 *
 * Layout, from `breakpoints.ts`: the brand block stacks above the links below
 * `lg:`, and sits opposite them in a single row above it.
 */

/** Every entry here must resolve. That is the whole point of this file. */
const LINKS: { label: string; href: string; newTab?: boolean }[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "What Claude finds", href: "#claude-analysis" },
  // `newTab` rather than "external": a mailto is external too, but opening a
  // blank tab beside the mail client is a tab the visitor then has to close.
  { label: "GitHub App", href: "https://github.com/apps/debtradar", newTab: true },
  { label: "support@debtradar.io", href: "mailto:support@debtradar.io" },
]

export function Footer() {
  return (
    <footer
      aria-label="Footer"
      className="w-full bg-[#050907] px-5 pt-11 pb-9 lg:px-[clamp(20px,4vw,56px)] lg:pt-11 lg:pb-10"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 lg:flex-row lg:items-start lg:justify-between lg:gap-[60px]">
        <div className="flex flex-col gap-2.5 lg:max-w-[280px] lg:gap-3.5">
          {/* The same lockup as the header and the landing nav, rather than the
              footer's own small radar mark — one definition of the brand. */}
          <Brand className="text-base" />

          <p className="text-[13px] leading-[1.6] text-[#8aa396]">
            Code debt has a half-life. We tell you which half is about to go off.
          </p>
        </div>

        <nav
          aria-label="Footer links"
          // A wrapping row rather than a grid: with four links a grid would
          // have to invent a second column out of whitespace.
          className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-3"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
              className="w-fit py-[5px] text-sm text-[#7c8c84] transition-colors hover:text-[#eaf6f0] lg:py-0 lg:text-[#7a9187]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* One bar at every width. The desktop frame tucks the copyright into the
          brand column instead, but that leaves it floating mid-footer once the
          links are taller than the brand block. */}
      <div className="mx-auto mt-7 flex w-full max-w-[1120px] items-center border-t border-[#111c17] pt-[18px]">
        <p className="font-mono text-[11px] text-[#3f5349]">© 2026 debtradar</p>
      </div>
    </footer>
  )
}
