import { describe, expect, it } from "vitest"
import { age, blobUrl } from "./format"

describe("age", () => {
  const ago = (ms: number) => new Date(Date.now() - ms)
  const DAY = 86_400_000

  it("scales the unit to the magnitude", () => {
    expect(age(ago(5 * 60_000))).toBe("5m")
    expect(age(ago(5 * 3_600_000))).toBe("5h")
    expect(age(ago(5 * DAY))).toBe("5d")
    expect(age(ago(90 * DAY))).toBe("3mo")
    expect(age(ago(400 * DAY))).toBe("1.1y")
    expect(age(ago(1200 * DAY))).toBe("3y")
  })

  it("never reports zero for something that just happened", () => {
    expect(age(ago(1000))).toBe("1m")
  })

  it("handles a missing date", () => {
    expect(age(null)).toBe("unknown")
  })
})

describe("blobUrl", () => {
  it("links to the line on the default branch", () => {
    const repo = { owner: "vorehoci", name: "helpmyvibe", defaultBranch: "main" }
    expect(blobUrl(repo, "src/auth.ts", 42)).toBe(
      "https://github.com/vorehoci/helpmyvibe/blob/main/src/auth.ts#L42",
    )
  })
})
