"use client"

import { track } from "@vercel/analytics/react"
import { recordFunnelEvent } from "@/app/funnel-actions"

/**
 * Records that a call to action was pressed, without changing what it does.
 *
 * The funnel this measures crosses two domains — the visitor leaves for GitHub
 * to sign in, comes back, leaves again to install the App — so page views alone
 * cannot say where people are lost. A view of `/` and a view of `/installed`
 * are the two ends; every interesting failure happens in between.
 *
 * Two recorders, not one. `track` is Vercel's, and on the Hobby plan it is
 * dropped server-side — custom events are a paid feature there, which is why
 * the first version of this measured precisely nothing. `recordFunnelEvent`
 * writes to our own table and works regardless of plan, and regardless of the
 * ad blockers a developer audience runs more than most. The Vercel call stays
 * so that upgrading later needs no code change.
 *
 * `onClickCapture` rather than `onClick`: the child may be a form that submits
 * on click, or a link that navigates, and capture runs before either. Neither
 * recorder is awaited — the browser is about to navigate, and a dropped record
 * is a far smaller loss than a click that hesitates.
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
    <span
      className="contents"
      onClickCapture={() => {
        track(event, { placement })
        void recordFunnelEvent(event, placement)
      }}
    >
      {children}
    </span>
  )
}
