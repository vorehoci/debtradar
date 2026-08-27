"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/** Long enough that typing a word is one request, short enough to feel live. */
const DEBOUNCE_MS = 250

/**
 * Free-text filter over the board.
 *
 * Server-side rather than filtering the rendered cards: only the top of each
 * column is loaded, so a client-side filter would search twenty rows out of
 * several hundred and confidently report nothing — worse than no search at all.
 *
 * The value lives in the URL so a filtered board can be linked and survives the
 * revalidation that follows every dismiss or severity change.
 */
export function SearchBox({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const input = useRef<HTMLInputElement>(null)

  // Typing is local state, so a revalidation mid-word must not rewind the box;
  // this only resyncs when the URL genuinely says something else, e.g. Back.
  //
  // Adjusted during render against the previous prop rather than in an effect.
  // As an effect it rendered once with the stale value before correcting, and
  // the setState-in-effect it needed is a lint error — see React's "storing
  // information from previous renders", the same pattern the board uses to drop
  // paged rows when a filter changes.
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setValue(initial)
  }

  useEffect(() => {
    if (value === initial) return

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (value.trim()) next.set("q", value.trim())
      else next.delete("q")

      const query = next.toString()
      // Replace, not push: otherwise every keystroke is a history entry and
      // Back has to be pressed once per character to leave the board.
      startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`))
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [value, initial, params, pathname, router])

  // "/" is the search shortcut everywhere a list of things is triaged, and the
  // guard keeps it from swallowing a slash typed into the comment box.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable
      if (event.key === "/" && !typing) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="relative w-full sm:w-auto">
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setValue("")
        }}
        placeholder="Search text or path…"
        aria-label="Search TODOs"
        className="w-full sm:w-56 rounded-md border border-edge-strong bg-panel px-3 py-1.5 text-xs text-ink outline-none transition-colors placeholder:text-faint focus:border-mint/50"
      />
      {pending ? (
        <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-faint">
          …
        </span>
      ) : null}
    </div>
  )
}
