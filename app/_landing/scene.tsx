"use client"

import { Component, type ReactNode } from "react"
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
 * A failure in the scene must not take the landing page with it.
 *
 * The runtime throws during render when the scene cannot be fetched or parsed —
 * a CDN outage, an offline visitor, a machine without WebGL — and an unhandled
 * throw inside a client component blanks the whole tree, on the one page whose
 * entire job is a first impression. Falling back to nothing leaves the page's
 * own background and the sign-in control, which is a quiet page rather than a
 * broken one.
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
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Positioning belongs to the caller — `.dr-canvas` in `hero.css` already fills
 * the section and forces the canvas to its size. A wrapper here would nest one
 * absolute box inside another for nothing.
 */
export function Backdrop() {
  return (
    <SceneBoundary>
      <Spline scene={SCENE_URL} />
    </SceneBoundary>
  )
}
