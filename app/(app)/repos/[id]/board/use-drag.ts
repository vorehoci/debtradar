"use client"

import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { useEffect, useRef, useState } from "react"
import type { Band } from "@/lib/describe"

/**
 * Marks an element as a draggable card.
 *
 * The library is imperative and framework-agnostic, so each hook attaches on
 * mount and returns its own cleanup — that is also why there is no React peer
 * dependency here to break at the next major version.
 */
export function useDraggableCard(todoId: string, band: Band, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // A read-only board still renders cards; they simply do not pick up.
    if (!enabled) return
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: () => ({ todoId, fromBand: band }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    })
  }, [todoId, band, enabled])

  return { ref, dragging }
}

/** Marks a column as somewhere a card can be dropped. */
export function useDropColumn(band: Band, enabled = true) {
  const ref = useRef<HTMLElement | null>(null)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      getData: () => ({ band }),
      // Dropping a card back where it started changes nothing, so the column
      // should not light up as though it would.
      canDrop: ({ source }) => source.data.fromBand !== band,
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: () => setOver(false),
    })
  }, [band, enabled])

  return { ref, over }
}
