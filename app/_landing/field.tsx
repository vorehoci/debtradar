"use client"

import { Component, type ReactNode, useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"

/**
 * Browser-only. A shader has nothing worth prerendering, and `document` is
 * touched on the first frame.
 */
const FieldGL = dynamic(() => import("./field-gl"), { ssr: false })

/**
 * Whether this visitor should get the shader at all.
 *
 * This decision is the reason the page is fast, and it has to happen *before*
 * the import rather than around the rendered element: `dynamic` fires on
 * mount, so a `<FieldGL>` hidden with a CSS class downloads the whole thing
 * and then paints nothing. Hiding is not declining.
 *
 * The same two questions the previous hero asked, for the same two reasons.
 * 768px is the `md:` line the rest of the landing page uses to tell a phone
 * from everything else, and a continuously animating field is precisely what
 * `prefers-reduced-motion` is about.
 *
 * Both start `false` so the server render and the first paint agree and the
 * still field is what everyone sees first. The shader is added afterwards, for
 * the machines that asked for it.
 */
function useWantsField(): boolean {
  const [wanted, setWanted] = useState(false)

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)")
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
 * A failure in the field must not take the landing page with it.
 *
 * An unhandled throw inside a client component blanks the whole tree, on the
 * one page whose entire job is a first impression. A driver that refuses a
 * context, a blocklisted GPU, or a shader that will not compile on some
 * embedded chipset all land here and get the still field instead.
 */
class FieldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn("debtradar: the scan field is unavailable", error)
  }

  render() {
    return this.state.failed ? <StillField /> : this.props.children
  }
}

/**
 * The same field, standing still, for phones and for anyone who asked for less
 * motion.
 *
 * Drawn in CSS rather than exported as an image: a screenshot of the shader
 * would be another request and a few hundred kilobytes on exactly the
 * connections this fallback exists to protect, and this paints with the first
 * frame instead of after a decode.
 *
 * It is the same composition as the shader — cold at the copy, heat gathering
 * toward the lower right, resolved into a mesh of points — so a visitor on a
 * phone sees the same idea rather than a blank substitute. It is also quieter
 * than the shader on purpose: on a 375px screen the field sits behind the
 * sentence that explains what the product is, and that sentence wins.
 */
function StillField() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-void">
      {/*
        The filaments.

        Composed for a portrait frame first, because that is the only frame
        this rendition is ever seen in by design: heat low and right of centre,
        cooler pools climbing the upper half, so a phone gets the same reading
        order as the shader rather than an empty top half with a smudge under
        the buttons.

        The alphas are roughly double the first attempt. They were tuned on a
        landscape canvas, and at 390px wide the pools had so little area that
        the mesh punched the remaining colour out of them entirely.
      */}
      <div
        className="absolute inset-[-12%] animate-drift motion-reduce:animate-none"
        style={{
          background: [
            "radial-gradient(52% 30% at 72% 70%, rgba(255,106,61,.70), transparent 72%)",
            "radial-gradient(58% 34% at 58% 52%, rgba(180,75,232,.62), transparent 74%)",
            "radial-gradient(66% 40% at 44% 32%, rgba(106,108,246,.52), transparent 76%)",
            "radial-gradient(44% 26% at 82% 16%, rgba(191,210,255,.20), transparent 72%)",
          ].join(","),
        }}
      />

      {/*
        The mesh.

        The shader resolves its field into points, and without this the still
        version is a soft gradient — which is the one thing the world refuses.
        A grid of holes punched over the pools costs nothing and keeps the two
        renditions recognisably the same material.

        4px rather than 3px with a wider hole: at 3px the dots fell under a
        device pixel on a phone and averaged back into the gradient they exist
        to break, which is the same mistake the shader's cell size made.
      */}
      <div
        className="absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage: "radial-gradient(circle, transparent 0 1px, var(--color-void) 1.4px)",
          backgroundSize: "4px 4px",
        }}
      />

      {/*
        No scrim here.

        There used to be one, and with `page.tsx` laying its own gradient over
        the top the two stacked: the phone's first viewport came out as plain
        void with a faint smudge at mid-right, and the thesis never reached the
        surface it matters most on. Protecting the copy is the page's job and
        it only needs doing once.
      */}
    </div>
  )
}

/**
 * Positioning belongs to the caller — the wrapper in `app/page.tsx` already
 * fills the section.
 */
export function ScanField() {
  const wantsField = useWantsField()
  const [failed, setFailed] = useState(false)

  // Stable identity, so the effect inside the canvas does not tear down and
  // rebuild the GL context on every parent render.
  const onFail = useCallback(() => setFailed(true), [])

  if (!wantsField || failed) return <StillField />

  return (
    <FieldBoundary>
      <FieldGL onFail={onFail} />
    </FieldBoundary>
  )
}
