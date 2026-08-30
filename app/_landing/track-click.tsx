"use client"

import { track } from "@vercel/analytics/react"

/**
 * Records that a call to action was pressed, without changing what it does.
 *
 * The funnel this measures crosses two domains — the visitor leaves for GitHub
 * to sign in, comes back, leaves again to install the App — so page views alone
 * cannot say where people are lost. A view of `/` and a view of `/installed`
 * are the two ends; every interesting failure happens in between.
 *
 * `onClickCapture` rather than `onClick`: the child may be a form that submits
 * on click, or a link that navigates, and capture runs before either. Nothing
 * is prevented or awaited — `track` posts a beacon that survives the unload, and
 * a dropped analytics event must never cost somebody the action they wanted.
 *
 * `display: contents` keeps the wrapper out of the layout entirely, so this can
 * go around a button inside a flex row without becoming a box of its own.
 */
export function TrackClick({
  event,
  placement,
  children,
}: {
  event: string
  placement: string
  children: React.ReactNode
}) {
  return (
    <span className="contents" onClickCapture={() => track(event, { placement })}>
      {children}
    </span>
  )
}
