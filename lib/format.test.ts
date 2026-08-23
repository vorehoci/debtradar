import { describe, expect, it } from "vitest"
import { blobUrl, formatDate, formatDateTime } from "./format"

describe("date formatting", () => {
  // Pinned output is the whole point: if these depended on the host's locale or
  // time zone, the server and the browser would render different strings and
  // React would refuse to hydrate.
  const moment = new Date("2026-08-23T14:32:07Z")

  it("formats a date independently of the host locale", () => {
    expect(formatDate(moment)).toBe("23 Aug 2026")
  })

  it("formats a timestamp in UTC and says so", () => {
    expect(formatDateTime(moment)).toBe("23 Aug 2026, 14:32 UTC")
  })

  it("accepts a serialised date, as arrives over the RSC boundary", () => {
    expect(formatDate("2026-08-23T14:32:07Z")).toBe("23 Aug 2026")
  })

  it("does not shift the day for a late-evening UTC time", () => {
    expect(formatDate(new Date("2026-08-23T23:59:00Z"))).toBe("23 Aug 2026")
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
