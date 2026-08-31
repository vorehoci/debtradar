"use client"

import { createContext, useContext } from "react"

/**
 * Whether the board being rendered can be changed by the person looking at it.
 *
 * A context rather than a prop, because the alternative is threading one
 * boolean through nine components and four levels to reach a checkbox. The
 * default is `false`, so every existing call site keeps its current behaviour
 * without being touched.
 *
 * This hides controls; it does not enforce anything. Enforcement already exists
 * and is server-side: every mutating action in `../actions.ts` goes through
 * `callerContext`, which throws without a session. What this prevents is a
 * public visitor being shown buttons that can only fail — and, for the analyse
 * button, being shown one that would spend money if it ever did work.
 */
const ReadOnlyContext = createContext(false)

export function ReadOnly({ children }: { children: React.ReactNode }) {
  return <ReadOnlyContext.Provider value={true}>{children}</ReadOnlyContext.Provider>
}

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext)
}
