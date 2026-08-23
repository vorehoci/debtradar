import { beforeEach, describe, expect, it } from "vitest"
import { consume, resetRateLimits } from "./rate-limit"

describe("consume", () => {
  beforeEach(resetRateLimits)

  it("allows up to the limit then refuses", () => {
    const results = [1, 2, 3, 4].map(() => consume("install-1", 3, 60_000))
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0])
  })

  it("keeps installations independent", () => {
    consume("install-1", 1, 60_000)
    expect(consume("install-1", 1, 60_000).allowed).toBe(false)
    expect(consume("install-2", 1, 60_000).allowed).toBe(true)
  })

  it("starts a fresh window once the old one passes", () => {
    const start = 1_000_000
    expect(consume("install-1", 1, 60_000, start).allowed).toBe(true)
    expect(consume("install-1", 1, 60_000, start + 59_000).allowed).toBe(false)
    expect(consume("install-1", 1, 60_000, start + 60_000).allowed).toBe(true)
  })

  it("reports how long until the window resets", () => {
    const start = 1_000_000
    consume("install-1", 1, 60_000, start)
    const denied = consume("install-1", 1, 60_000, start + 20_000)
    expect(denied.allowed).toBe(false)
    expect(denied.resetInSeconds).toBe(40)
  })
})
