import type { Metadata } from "next"
import Link from "next/link"
import { currentRepositories } from "@/lib/session-repos"
import { TrackClick } from "./_landing/track-click"
import { Brand } from "./brand"
import { HotspotCount, ScanConsole } from "./_landing/scan-console"
import { Backdrop } from "./_landing/scene"
import { Capabilities } from "./_landing/capabilities"
import { DemoCta } from "./_landing/demo-cta"
import { ClaudeAnalysis } from "./_landing/claude-analysis"
import { Divider } from "./_landing/divider"
import { Footer } from "./_landing/footer"
import { HowItWorks } from "./_landing/how-it-works"
import { ScanOutput } from "./_landing/scan-output"
import { Stats } from "./_landing/stats"
import { SignInButton } from "./_landing/sign-in"

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

/** Shared by the nav pill and the header link, so both do the same thing. */
const PILL =
  "cursor-pointer rounded-full border border-mint/30 bg-transparent px-4 py-2 text-[13px] text-mint transition-colors hover:border-mint/60 hover:bg-mint/[.12]"

const BUTTON =
  "rounded-[11px] px-6 py-3.5 text-[14.5px] font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
const PRIMARY = `${BUTTON} cursor-pointer border-none bg-mint text-[#04201a] shadow-[0_10px_30px_-8px_rgba(109,255,198,.55)] hover:shadow-[0_16px_40px_-10px_rgba(109,255,198,.7)]`
const GHOST = `${BUTTON} inline-block border border-white/[.14] bg-white/[.04] text-ink hover:border-mint/50 hover:text-mint`

/**
 * The public landing page.
 *
 * Outside the `(app)` route group on purpose — the header and sidebar navigate
 * an application the visitor has not signed into yet, so the shell would be
 * offering doors that are all locked.
 *
 * All of the copy is server-rendered; only the two readouts that follow the
 * scene's sweep are client components, so a visitor gets the headline in the
 * first HTML response rather than after a hydration round trip.
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
    // `--brand-accent` is pinned to mint on the wrapper: this surface is dark
    // whatever the system theme is, so the light-mode green would be wrong on
    // every section below, not just the hero.
    <main className="w-full bg-[#0a1b22] font-sans text-ink [--brand-accent:var(--color-mint)]">
      {/* The hero is exactly one viewport and clips its own scene; the sections
          below it scroll normally, so the overflow rule stays scoped here
          rather than sitting on the page. */}
      <section className="relative h-screen w-full overflow-hidden">
        {/*
          Two descendant selectors, both load-bearing.

          The canvas one sizes the scene: Spline renders at the scene's authored
          dimensions, so without it the canvas does not fill the section.

          The iframe one is what lets the page scroll. Spline mounts a sandboxed
          iframe as a sibling of the canvas, absolutely positioned over the whole
          scene, and it swallowed the wheel — so a visitor scrolling with the
          cursor anywhere on the hero, which is the entire first viewport, got a
          page that looked frozen. Only the iframe gives up its input; the canvas
          keeps pointer events, so the scene itself stays interactive.

          The `!` is required, not defensive: Spline writes
          `pointer-events: auto` as an inline style on that iframe, and an
          inline declaration outranks any class rule without it.
        */}
        <div className="absolute inset-0 [&_canvas]:block [&_canvas]:h-full! [&_canvas]:w-full! [&_iframe]:pointer-events-none!">
          <Backdrop />
        </div>

        {/* Transparent to the pointer, with links and buttons opting back in, so
          the overlay never swallows a drag meant for the scene. */}
        <div className="pointer-events-none absolute inset-0">
          <header className="absolute inset-x-0 top-0 flex h-[76px] items-center justify-between px-[clamp(20px,4vw,56px)]">
            <Brand />

            <nav className="flex items-center gap-7 text-[13.5px] text-muted">
              {/*
              Product, Docs and Pricing are gone: all three were dead links to
              routes that do not exist, and a 404 from the nav of a landing page
              costs more trust than the link was ever going to earn. What is
              left points somewhere real.
            */}
              <TrackClick event="cta" placement="nav-github-app">
                <a
                  href="https://github.com/apps/debtradar"
                  target="_blank"
                  rel="noreferrer"
                  className="pointer-events-auto transition-colors hover:text-ink max-md:hidden"
                >
                  GitHub App
                </a>
              </TrackClick>

              {signedIn ? (
                <Link href="/dashboard" className={`pointer-events-auto ${PILL}`}>
                  Dashboard
                </Link>
              ) : (
                <SignInButton className={`pointer-events-auto ${PILL}`}>Sign in</SignInButton>
              )}
            </nav>
          </header>

          <div className="absolute top-1/2 left-[clamp(20px,4vw,56px)] w-[min(46vw,620px)] min-w-80 -translate-y-1/2 max-md:top-[44%] max-md:w-[88vw]">
            {/* An expired session is the one state that has to explain itself:
              the visitor was signed in a moment ago and is now being asked to
              do it again, which reads as the app losing their work unless it
              says otherwise. */}
            {expired ? (
              <div className="mb-[22px] inline-flex items-center gap-[9px] rounded-full border border-signal/25 bg-signal/[.08] px-[13px] py-1.5 text-[11px] font-semibold tracking-[.18em] text-signal">
                <span className="size-1.5 rounded-full bg-signal" />
                GITHUB SESSION EXPIRED · SIGN IN AGAIN
              </div>
            ) : (
              <div className="mb-[22px] inline-flex items-center gap-[9px] rounded-full border border-mint/20 bg-mint/[.08] px-[13px] py-1.5 text-[11px] font-semibold tracking-[.18em] text-mint">
                <span className="size-1.5 animate-blip rounded-full bg-mint motion-reduce:animate-none" />
                GITHUB APP · RANKS ON EVERY PUSH
              </div>
            )}

            {/* 700, not 800: Space Grotesk tops out at 700, and asking for more
              gets a synthesised bold that smears the letterforms. */}
            <h1 className="text-[clamp(34px,4.6vw,64px)] leading-[1.03] font-bold tracking-[-.035em]">
              Find the TODO that hurts
              <br />
              <span className="bg-[linear-gradient(96deg,var(--color-mint)_20%,#39d7ff_90%)] bg-clip-text text-transparent">
                before
              </span>{" "}
              it finds <span className="text-signal">you.</span>
            </h1>

            <p className="mt-5 max-w-[33em] text-[clamp(14px,1.15vw,16.5px)] leading-[1.6] text-subtle">
              Every repository has hundreds of them, and a tracker full of them is a tracker nobody
              reads. debtradar scores each one on how long it has sat there, how hot the file around
              it runs, and whether the person who wrote it still works here — so you triage the four
              that matter instead of four hundred issues.
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              {signedIn ? (
                <Link href="/dashboard" className={`pointer-events-auto inline-block ${PRIMARY}`}>
                  Open your board
                </Link>
              ) : (
                <TrackClick event="cta" placement="hero-sign-in">
                  <SignInButton className={`pointer-events-auto ${PRIMARY}`}>
                    Scan your repo
                  </SignInButton>
                </TrackClick>
              )}

              {/* The second slot used to be empty for signed-out visitors, on the
                reasoning that a second button leading back to the same sign-in
                would be two doors into one room. True while both doors were
                sign-in; the demo is a different room, and it is the one the
                visitor can enter without handing over anything first. */}
              {signedIn ? (
                <Link href="/dashboard" className={`pointer-events-auto ${GHOST}`}>
                  View a live report →
                </Link>
              ) : (
                <DemoCta className={GHOST} />
              )}
            </div>

            <div className="mt-9 flex gap-[30px] text-[12.5px] text-muted">
              {/*
              The design shipped "1.4M files analysed daily" and "38% faster code
              review". Both are invented — there is no such measurement anywhere
              in this product — and a fabricated metric on a public page is a
              claim, not decoration. These three are things the code actually
              does.
            */}
              <div>
                <b className="mb-[3px] block text-xl font-bold tracking-[-.02em] text-ink">4</b>
                signals behind every score
              </div>
              <div>
                <b className="mb-[3px] block text-xl font-bold tracking-[-.02em] text-ink">0</b>
                issues filed in your tracker
              </div>
              <div>
                <HotspotCount />
                hotspots on this sweep
              </div>
            </div>
          </div>

          <ScanConsole />
        </div>
      </section>

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
