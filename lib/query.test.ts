import { describe, expect, it } from "vitest"
import { bandFor } from "./describe"
import { bandRange, buildQuery, parseBands, parseSort, toggleBand } from "./query"

describe("parseSort", () => {
  it("accepts known sorts and falls back to risk", () => {
    expect(parseSort("age")).toBe("age")
    expect(parseSort("nonsense")).toBe("risk")
    expect(parseSort(undefined)).toBe("risk")
  })
})

describe("parseBands", () => {
  it("reads a comma list and drops anything unrecognised", () => {
    expect(parseBands("critical,high")).toEqual(["critical", "high"])
    expect(parseBands("critical,bogus")).toEqual(["critical"])
  })

  it("treats all four as no filter", () => {
    expect(parseBands("critical,high,moderate,low")).toEqual([])
    expect(parseBands(undefined)).toEqual([])
  })
})

describe("toggleBand", () => {
  it("adds and removes", () => {
    expect(toggleBand([], "critical")).toEqual(["critical"])
    expect(toggleBand(["critical", "high"], "high")).toEqual(["critical"])
  })

  it("collapses a full selection back to no filter", () => {
    expect(toggleBand(["critical", "high", "moderate"], "low")).toEqual([])
  })
})

describe("buildQuery", () => {
  it("omits defaults", () => {
    expect(buildQuery({ bands: [], sort: "risk" })).toBe("")
  })

  it("emits a stable order regardless of click sequence", () => {
    expect(buildQuery({ bands: ["high", "critical"], sort: "risk" })).toBe("?band=critical%2Chigh")
    expect(buildQuery({ bands: ["critical", "high"], sort: "risk" })).toBe("?band=critical%2Chigh")
  })

  it("includes a non-default sort", () => {
    expect(buildQuery({ bands: [], sort: "churn" })).toBe("?sort=churn")
  })
})

describe("bandRange", () => {
  it("covers every score with no gaps or overlap", () => {
    for (let score = 0; score <= 100; score++) {
      const band = bandFor(score)
      const { min, max } = bandRange(band)
      expect(score).toBeGreaterThanOrEqual(min)
      if (max !== null) expect(score).toBeLessThanOrEqual(max)
    }
  })
})
