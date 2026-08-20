import { describe, expect, it } from "vitest"
import { fingerprint } from "./fingerprint"

describe("fingerprint", () => {
  it("is stable across reformatting", () => {
    const a = fingerprint("src/auth.ts", "TODO: handle expiry")
    expect(fingerprint("src/auth.ts", "  todo: handle   expiry  ")).toBe(a)
  })

  it("is stable when the comment moves to a different line", () => {
    // Line number is deliberately not an input — that is the whole point.
    expect(fingerprint("src/auth.ts", "TODO: handle expiry")).toBe(
      fingerprint("src/auth.ts", "TODO: handle expiry"),
    )
  })

  it("distinguishes the same comment in different files", () => {
    expect(fingerprint("src/auth.ts", "TODO: fix")).not.toBe(
      fingerprint("src/user.ts", "TODO: fix"),
    )
  })

  it("distinguishes different comments in the same file", () => {
    expect(fingerprint("src/auth.ts", "TODO: fix")).not.toBe(
      fingerprint("src/auth.ts", "TODO: fix later"),
    )
  })

  it("changes when the wording is edited — a known limitation", () => {
    expect(fingerprint("src/auth.ts", "TODO: handle expiry")).not.toBe(
      fingerprint("src/auth.ts", "TODO: handle token expiry"),
    )
  })
})
