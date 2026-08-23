import { type Band, BAND_THRESHOLDS } from "./describe"

export const SORTS = {
  risk: "Highest risk",
  age: "Oldest first",
  churn: "Most churn",
  recent: "Recently found",
  file: "File path",
} as const

export type Sort = keyof typeof SORTS

export const BANDS: Band[] = ["critical", "high", "moderate", "low"]

export function parseSort(raw: string | string[] | undefined): Sort {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && value in SORTS ? (value as Sort) : "risk"
}

/**
 * Selected bands, or an empty array meaning "no filter".
 *
 * Empty and all-four are deliberately the same thing to the caller, so the URL
 * stays clean when nothing is filtered rather than listing every band.
 */
export function parseBands(raw: string | string[] | undefined): Band[] {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return []

  const selected = value
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is Band => (BANDS as string[]).includes(part))

  return selected.length === BANDS.length ? [] : selected
}

/** Clicking a chip adds or removes that band. */
export function toggleBand(current: Band[], band: Band): Band[] {
  const next = current.includes(band)
    ? current.filter((b) => b !== band)
    : [...current, band]
  return next.length === BANDS.length ? [] : next
}

/** Builds a querystring, omitting defaults so a plain URL stays plain. */
export function buildQuery(state: { bands: Band[]; sort: Sort }): string {
  const params = new URLSearchParams()
  if (state.bands.length > 0) {
    // Sorted so the same selection always produces the same URL.
    params.set("band", BANDS.filter((b) => state.bands.includes(b)).join(","))
  }
  if (state.sort !== "risk") params.set("sort", state.sort)

  const query = params.toString()
  return query ? `?${query}` : ""
}

/** Inclusive score bounds for a band; `max` of null means unbounded. */
export function bandRange(band: Band): { min: number; max: number | null } {
  switch (band) {
    case "critical":
      return { min: BAND_THRESHOLDS.critical, max: null }
    case "high":
      return { min: BAND_THRESHOLDS.high, max: BAND_THRESHOLDS.critical - 1 }
    case "moderate":
      return { min: BAND_THRESHOLDS.moderate, max: BAND_THRESHOLDS.high - 1 }
    case "low":
      return { min: 0, max: BAND_THRESHOLDS.moderate - 1 }
  }
}
