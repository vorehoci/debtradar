import { describe, expect, it } from "vitest"
import {
  BANDS,
  bandFor,
  parseBand,
  describeAge,
  describeAuthor,
  describeChurn,
  describeRepo,
  describeRisk,
  duration,
  explainScore,
} from "./describe"

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY)

describe("bandFor", () => {
  it("labels each threshold", () => {
    expect(bandFor(80)).toBe("critical")
    expect(bandFor(70)).toBe("critical")
    expect(bandFor(69)).toBe("high")
    expect(bandFor(50)).toBe("high")
    expect(bandFor(35)).toBe("moderate")
    expect(bandFor(29)).toBe("low")
  })

  it("puts a fresh repo's worst item in low, not critical", () => {
    // The whole point: 35 must not read as a failing grade.
    expect(bandFor(35)).toBe("moderate")
    expect(bandFor(22)).toBe("low")
  })
})

describe("parseBand", () => {
  it("accepts a known band", () => {
    expect(parseBand("critical")).toBe("critical")
  })

  it("treats anything unrecognised as back-to-automatic", () => {
    // A Server Action argument is untrusted input, so a bad value must clear
    // the override rather than be trusted or throw.
    expect(parseBand("auto")).toBeNull()
    expect(parseBand("")).toBeNull()
    expect(parseBand(undefined)).toBeNull()
    expect(parseBand(42)).toBeNull()
  })
})

describe("BANDS", () => {
  it("is ordered worst first, matching the board's columns", () => {
    expect(BANDS).toEqual(["critical", "high", "moderate", "low"])
  })

  it("labels every score, and only ever gets less severe", () => {
    let previous = 0
    for (let score = 0; score <= 100; score++) {
      const rank = BANDS.length - 1 - BANDS.indexOf(bandFor(score))
      expect(rank).toBeGreaterThanOrEqual(previous)
      previous = rank
    }
  })
})

describe("duration", () => {
  it("scales the unit to the magnitude", () => {
    expect(duration(ago(0))).toBe("today")
    expect(duration(ago(1))).toBe("1 day")
    expect(duration(ago(12))).toBe("12 days")
    expect(duration(ago(90))).toBe("3 months")
    expect(duration(ago(365))).toBe("1 year")
    expect(duration(ago(3722))).toBe("10 years")
  })
})

describe("describeChurn", () => {
  it("states low churn as a mitigating fact, not a number", () => {
    expect(describeChurn(0)).toBe("quiet file")
    expect(describeChurn(1)).toBe("quiet file")
  })

  it("quantifies real churn", () => {
    expect(describeChurn(31)).toBe("changed 31×/year")
  })

  it("admits when it does not know", () => {
    expect(describeChurn(null)).toBe("churn unknown")
  })
})

describe("describeAuthor", () => {
  it("distinguishes still-here from long-gone", () => {
    expect(describeAuthor("zomars", ago(3))).toBe("zomars is still active")
    expect(describeAuthor("kirrg001", ago(1100))).toBe("kirrg001 hasn't committed in 3 years")
  })

  it("does not claim someone left when blame found no account", () => {
    expect(describeAuthor(null, null)).toBe("author unknown")
    expect(describeAuthor("nsfmc", null)).toBe("nsfmc, activity unknown")
  })
})

describe("describeRisk", () => {
  it("reads as a sentence a person can act on", () => {
    expect(
      describeRisk({
        authoredAt: ago(3722),
        fileChurn: 14,
        authorLogin: "kirrg001",
        authorLastActiveAt: ago(1100),
      }),
    ).toBe("10 years old · changed 14×/year · kirrg001 hasn't committed in 3 years")
  })

  it("reads as reassuring when nothing is wrong", () => {
    expect(
      describeRisk({
        authoredAt: ago(2),
        fileChurn: 1,
        authorLogin: "vorehoci",
        authorLastActiveAt: ago(1),
      }),
    ).toBe("2 days old · quiet file · vorehoci is still active")
  })
})

describe("describeRepo", () => {
  it("summarises a repository in trouble", () => {
    expect(describeRepo({ open: 397, critical: 38, high: 112 })).toBe(
      "397 open · 38 critical · 112 high",
    )
  })

  it("says nothing urgent rather than showing a low score", () => {
    expect(describeRepo({ open: 10, critical: 0, high: 0 })).toBe("10 open · nothing urgent")
  })

  it("handles an empty repository", () => {
    expect(describeRepo({ open: 0, critical: 0, high: 0 })).toBe("nothing outstanding")
  })
})

describe("explainScore", () => {
  const base = {
    authoredAt: ago(1216),
    fileChurn: 31,
    authorLogin: "Mythie",
    authorLastActiveAt: ago(1100),
    marker: "FIXME",
    category: null,
    ageFactor: 0.33,
    churnFactor: 0.75,
    orphanFactor: 1.0,
    severityFactor: 1.0,
  }

  it("pairs each factor with the fact behind it, not a bare number", () => {
    expect(explainScore(base).map((c) => [c.label, c.detail])).toEqual([
      ["age", "3 years old"],
      ["churn", "changed 31×/year"],
      ["author", "author gone 3 years"],
      ["marker", "FIXME"],
    ])
  })

  it("reports points out of the weight's maximum", () => {
    expect(explainScore(base).map((c) => `${c.points}/${c.max}`)).toEqual([
      "10/30",
      "19/25",
      "20/20",
      "25/25",
    ])
  })

  it("says author still active rather than implying abandonment", () => {
    const [, , author] = explainScore({ ...base, authorLastActiveAt: ago(2) })
    expect(author.detail).toBe("author still active")
  })

  it("falls back to the LLM category when there is no marker", () => {
    const [, , , marker] = explainScore({ ...base, marker: null, category: "hidden-todo" })
    expect(marker.detail).toBe("hidden-todo")
  })
})
