"use client"

import { Component, type ReactNode, useEffect, useState } from "react"
import dynamic from "next/dynamic"

/**
 * The published Spline scene.
 *
 * Hosted rather than exported to a GLB in `public/`. The export route was tried
 * and abandoned: it added a loader, a 1.5 MB asset, name lookups that broke
 * silently whenever the exporter rewrote a name, a root scale of 0.01 to undo,
 * and materials that arrived subtly unlike the ones authored — each of which
 * had to be diagnosed separately. Spline renders its own scene with its own
 * runtime, so none of those seams exist.
 *
 * The trade is a runtime dependency on a third-party CDN for the hero of the
 * public page, which is what the boundary below is for.
 */
const SCENE_URL = "https://prod.spline.design/lJj21CrXOsvirr3t/scene.splinecode"

/**
 * Browser-only, rather than the package's `/next` entry.
 *
 * That entry is built to server-render, but its runtime statically references
 * the Draco decoder (`../libs/draco/draco_decoder.wasm` and friends) and a
 * `boolean_wasm_bg.wasm`, none of which the bundler can resolve — they are
 * fetched from a CDN at runtime and do not ship with the package. Importing it
 * for the server fails the build outright. Loading it in the browser only
 * sidesteps the question: a WebGL canvas has nothing worth prerendering.
 *
 * The remaining references are aliased away in `next.config.ts`; see
 * `app/_landing/empty.ts`.
 */
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false })

/**
 * Whether this visitor should get the WebGL scene at all.
 *
 * Measured on the deployed page: the landing page ships 2.6 MB of JavaScript,
 * nearly all of it the Spline runtime, plus a 113 KB scene from a third-party
 * origin. That is five to ten times a normal landing page, and the visitors
 * paying for it are the ones least able to afford it — advertising traffic
 * arrives overwhelmingly on phones, on cellular, with a cold cache.
 *
 * A CSS `hidden` would not have helped. The dynamic import fires when the
 * component mounts, so a hidden `<Spline>` downloads the entire runtime and
 * then draws nothing. The decision has to happen before the import, which means
 * it happens here, in JavaScript.
 *
 * Both checks start `false` so the server render and the first paint agree, and
 * the scene is added afterwards for the machines that asked for it. That order
 * is deliberate: the fallback must be what everyone sees first, not a flash of
 * empty space while a decision is made.
 */
function useWantsScene(): boolean {
  const [wanted, setWanted] = useState(false)

  useEffect(() => {
    // 768px is the `md:` boundary from breakpoints.ts — the same line the rest
    // of the landing page uses to tell a phone from everything else.
    const wide = window.matchMedia("(min-width: 768px)")
    // An animated 3D scene is precisely what this preference is about.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)")

    const update = () => setWanted(wide.matches && !still.matches)
    update()

    wide.addEventListener("change", update)
    still.addEventListener("change", update)
    return () => {
      wide.removeEventListener("change", update)
      still.removeEventListener("change", update)
    }
  }, [])

  return wanted
}

/**
 * A failure in the scene must not take the landing page with it.
 *
 * The runtime throws during render when the scene cannot be fetched or parsed —
 * a CDN outage, an offline visitor, a machine without WebGL — and an unhandled
 * throw inside a client component blanks the whole tree, on the one page whose
 * entire job is a first impression. Falling back to the static backdrop leaves a
 * quiet page rather than a broken one.
 */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn("debtradar: the Spline scene is unavailable", error)
  }

  render() {
    return this.state.failed ? <StaticBackdrop /> : this.props.children
  }
}

/**
 * The radar dial, in CSS, for phones and for anyone who asked for less motion.
 *
 * Drawn rather than photographed: a screenshot of the scene would be another
 * request and another few hundred kilobytes, and this costs nothing at all —
 * no asset, no fetch, and it is painted with the first frame instead of after
 * a runtime boots.
 *
 * It is also much fainter than the scene it replaces, which fixes a second
 * problem rather than only the weight. On a 375px screen the WebGL radar
 * rendered straight through the body paragraph and left the third stat
 * illegible; the sentence explaining what the product does was the thing being
 * obscured. This sits low and dim, and stays out of the way of the words.
 *
 * The rings echo `app/icon.svg`, so the fallback reads as the same object as
 * the favicon rather than as a missing image.
 */
function StaticBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Anchored below and right of the copy, and wider than the viewport so
          the outer rings run off the edge instead of closing into a target. */}
      <div className="absolute top-[58%] -right-[30%] aspect-square w-[150%] opacity-[0.28]">
        {[100, 74, 50, 28].map((size) => (
          <div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-mint/25"
            style={{ width: `${size}%`, height: `${size}%` }}
          />
        ))}

        {/* The sweep. A single conic wedge fading to nothing, which is the one
            part of a radar that reads as a radar even when it is not moving. */}
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_210deg,var(--color-mint)_0deg,transparent_55deg)] opacity-[0.16]" />
      </div>

      {/* Keeps the dial from competing with the headline: the copy sits top-left,
          so the gradient is heaviest exactly there. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_25%,#0a1b22_38%,transparent_78%)]" />
    </div>
  )
}

/**
 * Positioning belongs to the caller — the wrapper in `app/page.tsx` already
 * fills the section and forces the canvas to its size.
 */
export function Backdrop() {
  const wantsScene = useWantsScene()

  if (!wantsScene) return <StaticBackdrop />

  return (
    <SceneBoundary>
      <Spline scene={SCENE_URL} />
    </SceneBoundary>
  )
}
