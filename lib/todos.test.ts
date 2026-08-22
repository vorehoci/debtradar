import { describe, expect, it } from "vitest"
import { markerIn, scanPatch, scanSource } from "./todos"

describe("markerIn", () => {
  it("matches a marker that opens the comment, in any case", () => {
    expect(markerIn("TODO: fix this")).toBe("TODO")
    expect(markerIn("todo fix this")).toBe("TODO")
    expect(markerIn("FIXME - broken")).toBe("FIXME")
  })

  it("matches a shouted marker anywhere in the comment", () => {
    expect(markerIn("left this as a HACK for now")).toBe("HACK")
  })

  it("ignores marker words used as ordinary prose", () => {
    expect(markerIn("fixes the bug where users double-submit")).toBeNull()
    expect(markerIn("this refactor made the parser simpler")).toBeNull()
  })

  it("returns null for a comment with no marker", () => {
    expect(markerIn("returns the parsed token")).toBeNull()
  })
})

describe("scanPatch", () => {
  it("tags marked and unmarked comments alike", () => {
    const patch = [
      "@@ -1,2 +1,5 @@",
      " export function auth() {",
      "+  // TODO: handle expiry",
      "+  // not sure this covers the edge case",
      "+  return null",
      " }",
    ].join("\n")

    expect(scanPatch("src/auth.ts", patch)).toEqual([
      { file: "src/auth.ts", line: 2, text: "TODO: handle expiry", marker: "TODO" },
      { file: "src/auth.ts", line: 3, text: "not sure this covers the edge case", marker: null },
    ])
  })

  it("skips files with no known comment syntax", () => {
    expect(scanPatch("logo.png", "@@ -1 +1 @@\n+binary")).toEqual([])
  })
})

describe("scanSource", () => {
  it("numbers every comment in a whole file from 1", () => {
    const source = [
      "export function auth() {", // 1
      "  // TODO: handle expiry", // 2
      "  return null", // 3
      "}", // 4
      "// a trailing note", // 5
    ].join("\n")

    expect(scanSource("src/auth.ts", source)).toEqual([
      { file: "src/auth.ts", line: 2, text: "TODO: handle expiry", marker: "TODO" },
      { file: "src/auth.ts", line: 5, text: "a trailing note", marker: null },
    ])
  })

  it("returns nothing for an unknown file type", () => {
    expect(scanSource("logo.png", "// TODO: not really code")).toEqual([])
  })
})
