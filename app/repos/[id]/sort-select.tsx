"use client"

import { useRouter } from "next/navigation"
import { SORTS, type Sort } from "@/lib/query"

/**
 * The band chips are plain links and work without JavaScript; a select cannot,
 * so this is the one interactive island on the page.
 */
export function SortSelect({
  value,
  bandParam,
  basePath,
}: {
  value: Sort
  bandParam: string
  basePath: string
}) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span>Order by</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams()
          if (bandParam) params.set("band", bandParam)
          if (event.target.value !== "risk") params.set("sort", event.target.value)
          const query = params.toString()
          router.push(query ? `${basePath}?${query}` : basePath)
        }}
        className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
      >
        {Object.entries(SORTS).map(([key, label]) => (
          <option key={key} value={key} className="bg-white dark:bg-neutral-900">
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
