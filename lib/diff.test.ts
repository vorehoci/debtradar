import { describe, expect, it } from "vitest"
import { parseAddedLines, parseRemovedLines } from "./diff"
import { commentSyntaxFor, commentTextIn } from "./comments"

describe("parseAddedLines", () => {
  it("numbers additions against the new file, ignoring removals", () => {
    const patch = [
      "@@ -10,6 +10,8 @@ export function authenticate(token: string) {",
      "   const parsed = parseToken(token)",
      "-  if (!parsed) throw new Error('bad')",
      "+  // TODO: handle expired tokens",
      "+  if (!parsed) return null",
      " ",
      "   return parsed",
    ].join("\n")

    expect(parseAddedLines(patch)).toEqual([
      { line: 11, text: "  // TODO: handle expired tokens" },
      { line: 12, text: "  if (!parsed) return null" },
    ])
  })

  it("restarts the counter at each hunk header", () => {
    const patch = [
      "@@ -10,2 +10,3 @@",
      " function a() {}",
      "+  // first",
      " ",
      "@@ -40,2 +42,3 @@",
      " function helper() {",
      "+  // FIXME: naive",
      " }",
    ].join("\n")

    expect(parseAddedLines(patch)).toEqual([
      { line: 11, text: "  // first" },
      { line: 43, text: "  // FIXME: naive" },
    ])
  })

  it("handles hunk headers with the line count omitted", () => {
    const patch = ["@@ -1 +1 @@", "-old", "+new"].join("\n")
    expect(parseAddedLines(patch)).toEqual([{ line: 1, text: "new" }])
  })

  it("ignores the no-trailing-newline marker", () => {
    const patch = ["@@ -1,2 +1,2 @@", " a", "+b", "\\ No newline at end of file"].join("\n")
    expect(parseAddedLines(patch)).toEqual([{ line: 2, text: "b" }])
  })

  it("returns nothing for an empty patch", () => {
    expect(parseAddedLines("")).toEqual([])
  })
})

describe("parseRemovedLines", () => {
  it("numbers removals against the old file, ignoring additions", () => {
    const patch = [
      "@@ -10,6 +10,8 @@ export function authenticate(token: string) {",
      "   const parsed = parseToken(token)",
      "-  // TODO: handle expiry",
      "-  if (!parsed) throw new Error('bad')",
      "+  if (!parsed) return null",
      "   return parsed",
    ].join("\n")

    expect(parseRemovedLines(patch)).toEqual([
      { line: 11, text: "  // TODO: handle expiry" },
      { line: 12, text: "  if (!parsed) throw new Error('bad')" },
    ])
  })

  it("keeps the two sides independent when they drift apart", () => {
    // Old side starts at 5, new side at 50: additions must not move the old
    // counter, and the removal must still be numbered against the old file.
    const patch = ["@@ -5,2 +50,2 @@", "+added", "+another", "-gone", " context"].join("\n")

    expect(parseRemovedLines(patch)).toEqual([{ line: 5, text: "gone" }])
    expect(parseAddedLines(patch)).toEqual([
      { line: 50, text: "added" },
      { line: 51, text: "another" },
    ])
  })

  it("returns nothing when the patch only adds", () => {
    expect(parseRemovedLines("@@ -1,1 +1,2 @@\n a\n+b")).toEqual([])
  })
})

describe("commentSyntaxFor", () => {
  it("resolves by extension", () => {
    expect(commentSyntaxFor("src/auth.ts")?.line).toEqual(["//"])
    expect(commentSyntaxFor("scripts/deploy.py")?.line).toEqual(["#"])
    expect(commentSyntaxFor("queries/report.sql")?.line).toEqual(["--"])
  })

  it("recognises extensionless Dockerfiles", () => {
    expect(commentSyntaxFor("docker/Dockerfile")?.line).toEqual(["#"])
  })

  it("returns undefined for unknown types", () => {
    expect(commentSyntaxFor("logo.png")).toBeUndefined()
  })
})

describe("commentTextIn", () => {
  const ts = commentSyntaxFor("a.ts")!
  const py = commentSyntaxFor("a.py")!

  it("reads line comments", () => {
    expect(commentTextIn("  // TODO: fix this", ts)).toBe("TODO: fix this")
    expect(commentTextIn("x = 1  # note", py)).toBe("note")
  })

  it("reads block comments, closed or not", () => {
    expect(commentTextIn("/* TODO: fix */", ts)).toBe("TODO: fix")
    expect(commentTextIn("/* opening", ts)).toBe("opening")
    expect(commentTextIn(" * continuation", ts)).toBe("continuation")
  })

  it("does not mistake a URL scheme for a comment", () => {
    expect(commentTextIn('const u = "https://example.com"', ts)).toBeUndefined()
  })

  it("still finds a real comment after a URL", () => {
    expect(commentTextIn('const u = "https://x.com" // TODO: move to env', ts)).toBe("TODO: move to env")
  })

  it("returns undefined for code with no comment", () => {
    expect(commentTextIn("const x = 1", ts)).toBeUndefined()
  })
})
