import type { Metadata } from "next"
import Link from "next/link"
import { currentRepositories } from "@/lib/session-repos"
import { TrackClick } from "./_landing/track-click"
import { Brand } from "./brand"
import { ScanField } from "./_landing/field"
import { Capabilities } from "./_landing/capabilities"
import { DemoCta } from "./_landing/demo-cta"
import { ClaudeAnalysis } from "./_landing/claude-analysis"
import { Divider } from "./_landing/divider"
import { Footer } from "./_landing/footer"
import { HowItWorks } from "./_landing/how-it-works"
import { Ranked } from "./_landing/ranked"
import { Readout } from "./_landing/readout"
import { ScanOutput } from "./_landing/scan-output"
import { Stats } from "./_landing/stats"
import { SignInButton } from "./_landing/sign-in"
import { Arrow } from "./_icons"

export const dynamic = "force-dynamic"

/**
 * Canonical lives here rather than in the root layout.
 *
 * A layout-level canonical applies to every page under it, so it would tell
 * Google that /dashboard and /repos/123 are all copies of the home page. This
 * is the only indexable route, so it is the only one that needs the tag.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

/**
 * Controls, in the world's own vocabulary.
 *
 * Hairline rectangles with an arrow, never a filled pill — the pill is the
 * category's button and this page is not wearing it. Ember is the one
 * incandescent accent and it is spent here, on hover and focus, which is what
 * keeps it reading as heat rather than as a second brand colour.
 *
 * The shadow carries an offset and a blur. A zero-offset coloured halo is the
 * glow this world's reference leans on, and it is decoration; this is depth.
 */
const CONTROL =
  "pointer-events-auto group inline-flex items-center gap-3 px-7 py-4 text-[13.5px] uppercase tracking-[.16em] transition-colors duration-200"
const PRIMARY = `${CONTROL} cursor-pointer border border-lilac bg-lilac/[.18] text-ink shadow-[0_14px_34px_-16px_rgba(106,108,246,.95)] hover:border-ember hover:text-ember`

/**
 * Not the quiet one, and not an ember one either.
 *
 * The demo leads because the funnel says so, and that order stands. The first
 * build gave this a hairline edge and muted text, which made the actual
 * conversion goal — installing the App — the faintest thing in the viewport.
 * The correction overshot the other way: an ember rest state here put ember on
 * the headline, this control and the field's heat all at once, and OWN-WORLD
 * spends it on the active state and the primary action only.
 *
 * A lilac edge with full-strength ink is the middle. It reads as an offer
 * rather than an afterthought, stays a clear step below the primary's filled
 * tint and shadow, and leaves ember to the hover, where it means "active".
 */
const SECONDARY = `${CONTROL} border border-lilac/60 text-ink hover:border-ember hover:text-ember`

/** The pipeline, in order. The sequence is the information: a scan precedes a
 *  ranking, a ranking precedes triage. */
const STAGES = ["Scan", "Rank", "Triage", "Demo"]

/**
 * The public landing page.
 *
 * Outside the `(app)` route group on purpose — the header and sidebar navigate
 * an application the visitor has not signed into yet, so the shell would be
 * offering doors that are all locked.
 *
 * All of the copy is server-rendered; only the field behind it is a client
 * component, so a visitor gets the headline in the first HTML response rather
 * than after a hydration round trip.
 */
export default async function Landing() {
  /**
   * The same question the dashboard asks, so the two agree.
   *
   * Checking `session.accessToken` here instead was a bug you could hit once a
   * day: GitHub App user tokens expire after eight hours, and an expired token
   * is still a token in the cookie. This page would show a Dashboard pill, the
   * dashboard would ask GitHub, get a 401, and redirect straight back here —
   * with nothing on screen to say why.
   *
   * It costs nothing for a visitor with no session: `currentRepositories`
   * returns before it calls GitHub when there is no token at all.
   */
  const session = await currentRepositories()
  const signedIn = session.state === "ok"
  const expired = session.state === "expired"

  return (
    <main className="w-full bg-void font-sans text-ink">
      {/* The hero is exactly one viewport and clips its own field; the sections
          below it scroll normally, so the overflow rule stays scoped here
          rather than sitting on the page. */}
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <ScanField />
        </div>

        {/*
          The scrim, and the reason the copy is readable at any field state.

          The shader already keeps its heat to the right, but "mostly dark over
          there" is not a contrast guarantee: the field moves, and a filament
          drifting under the body paragraph is a legibility failure that only
          appears for a few seconds at a time, which is the worst kind. This
          gradient is deterministic — the copy column always has ground — so
          the field can stay vivid where there is nothing to read instead of
          being dimmed everywhere to protect text in one corner.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, var(--color-void) 0%, rgba(11,13,26,.94) 30%, rgba(11,13,26,.66) 52%, rgba(11,13,26,.18) 72%, transparent 88%)",
          }}
        />

        {/* The right edge, for the scroll rail. It sits exactly where the
            field runs hottest, so without this the rail is legible only when
            the filaments happen to drift off it. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-[170px] max-lg:hidden"
          style={{ background: "linear-gradient(to left, rgba(11,13,26,.96) 30%, transparent)" }}
        />

        {/* The top and bottom strips, so the navigation and the readout sit on
            their own ground rather than on filaments. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[150px]"
          style={{ background: "linear-gradient(to bottom, rgba(11,13,26,.85), transparent)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[190px]"
          style={{ background: "linear-gradient(to top, rgba(11,13,26,.92), transparent)" }}
        />

        {/* Transparent to the pointer, with links and buttons opting back in,
            so the overlay never swallows a gesture meant for the field. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <header className="flex h-[76px] shrink-0 items-center justify-between px-[clamp(20px,4vw,56px)]">
            <Brand />

            <nav className="flex items-center gap-7 text-[12.5px] tracking-[.16em] text-subtle uppercase">
              {/*
                Product, Docs and Pricing are gone: all three were dead links to
                routes that do not exist, and a 404 from the nav of a landing
                page costs more trust than the link was ever going to earn.
                Pricing stays gone for a second reason — there is no price.
              */}
              <TrackClick event="cta" placement="nav-github-app">
                <a
                  href="https://github.com/apps/debtradar"
                  target="_blank"
                  rel="noreferrer"
                  className="pointer-events-auto transition-colors hover:text-ember max-md:hidden"
                >
                  GitHub App
                </a>
              </TrackClick>

              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="pointer-events-auto border border-edge-strong px-4 py-2 transition-colors hover:border-ember hover:text-ember"
                >
                  Dashboard
                </Link>
              ) : (
                <SignInButton className="pointer-events-auto cursor-pointer border border-edge-strong px-4 py-2 text-[12.5px] tracking-[.16em] uppercase transition-colors hover:border-ember hover:text-ember">
                  Sign in
                </SignInButton>
              )}
            </nav>
          </header>

          <div className="flex min-h-0 flex-1 items-center gap-[clamp(20px,4vw,56px)] px-[clamp(20px,4vw,56px)]">
            {/* The stage index. Hidden below `lg:` rather than wrapped: on a
                phone it would be four more lines between the visitor and the
                headline. */}
            <ol className="flex w-[84px] shrink-0 flex-col gap-8 max-lg:hidden">
              {STAGES.map((stage, i) => (
                <li key={stage} className="flex flex-col gap-1">
                  <span className="tabular text-[13px] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11.5px] tracking-[.2em] text-muted uppercase">
                    {stage}
                  </span>
                </li>
              ))}
            </ol>

            <div className="min-w-0 max-w-[760px]">
              {/* An expired session is the one state that has to explain
                  itself: the visitor was signed in a moment ago and is now
                  being asked to do it again, which reads as the app losing
                  their work unless it says otherwise. */}
              {expired && (
                <p className="mb-7 inline-flex items-center gap-2.5 border border-ember/40 px-3.5 py-2 text-[11.5px] tracking-[.18em] text-ember uppercase">
                  <span aria-hidden="true" className="size-1.5 bg-ember" />
                  GitHub session expired — sign in again
                </p>
              )}

              {/*
                Set narrow on the width axis, which is why the face is loaded
                with `wdth`. At 62% four words hold a line that would otherwise
                take six, and the display stays one idea rather than a
                paragraph in large type.
              */}
              {/* No count in the headline. The readout below it carries the
                  real one from the n8n scan, and a rhetorical "four hundred"
                  sitting directly above a measured 792 reads as a page that
                  does not know its own numbers. */}
              <h1 className="text-[clamp(42px,7.4vw,96px)] leading-[0.94] font-semibold tracking-[-.035em] [font-stretch:64%]">
                Hundreds of notes.
                <br />
                <span className="text-ember">One</span> is about to hurt.
              </h1>

              <p className="mt-7 max-w-[62ch] text-[clamp(14.5px,1.2vw,17px)] leading-[1.62] tracking-[.01em] text-subtle">
                debtradar scores every TODO already in your code on how long it has sat there, how
                hot the file around it runs, and whether the person who wrote it still works here —
                then ranks them, so you fix the one that matters instead of reading all of them.
              </p>

              {/*
                For a signed-out visitor the demo leads and signing in follows.
                That is a reversal, and the measurement asked for it: of the
                first seven presses recorded in `funnel_events`, six went to the
                demo and one to sign-in. The old order asked a stranger who had
                arrived from an advertisement thirty seconds earlier to hand over
                GitHub access before being shown anything, and 148 paid clicks
                produced no installs at all.

                A signed-in visitor keeps the old order: they have a board, so
                opening it is the thing they came for.
              */}
              <div className="mt-10 flex flex-wrap gap-3.5">
                {signedIn ? (
                  <Link href="/dashboard" className={PRIMARY}>
                    Open your board
                    <Arrow />
                  </Link>
                ) : (
                  <DemoCta className={PRIMARY} />
                )}

                {signedIn ? (
                  <Link href="/demo" className={SECONDARY}>
                    See the n8n scan
                    <Arrow />
                  </Link>
                ) : (
                  <TrackClick event="cta" placement="hero-sign-in">
                    <SignInButton className={`cursor-pointer ${SECONDARY}`}>
                      Scan my repository
                    </SignInButton>
                  </TrackClick>
                )}
              </div>
            </div>
          </div>

          {/* The readout sits where this world puts its loader, bottom left,
              and carries real figures from the n8n scan rather than a
              percentage of nothing. */}
          <div className="flex shrink-0 items-end justify-between gap-6 px-[clamp(20px,4vw,56px)] pb-[clamp(20px,3vw,40px)]">
            <Readout />

            <p className="text-right text-[11px] leading-[1.7] tracking-[.2em] text-faint uppercase max-md:hidden">
              Field
              <br />
              <span className="text-muted">live scan density</span>
            </p>
          </div>
          <ScrollRail />
        </div>
      </section>

      <Ranked />

      {/* The rules only exist below `lg:` — see divider.tsx. */}
      <Divider />
      <Stats />
      <Divider />
      <ScanOutput />
      <Divider />
      <HowItWorks />
      <Divider />
      <ClaudeAnalysis />
      <Divider />
      <Capabilities />
      <Divider />
      <Footer />
    </main>
  )
}

/**
 * The scroll rail.
 *
 * The world's own device, and the one the reference leads with. It also does a
 * job here that nothing else does: the hero is exactly one viewport, so with
 * no cue at the right margin a visitor has nothing telling them the page
 * continues. The ticks mark the four stages the left index names.
 */
function ScrollRail() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-[clamp(20px,4vw,56px)] flex -translate-y-1/2 flex-col items-center gap-3 max-lg:hidden"
    >
      <span className="text-[10.5px] tracking-[.24em] text-subtle uppercase [writing-mode:vertical-rl]">
        Scroll
      </span>
      <span className="h-14 w-px bg-faint" />
      <span className="size-1.5 rounded-full bg-lilac" />
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1 rounded-full bg-subtle" />
      ))}
      <span className="h-14 w-px bg-faint" />
    </div>
  )
}
