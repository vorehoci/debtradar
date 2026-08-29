import { describe, expect, it } from "vitest"
import { setupOutcome } from "./setup-outcome"

describe("setupOutcome", () => {
  it("reads a completed installation", () => {
    expect(setupOutcome({ installation_id: "12345", setup_action: "install" })).toEqual({
      kind: "installed",
      installationId: 12345,
    })
  })

  it("distinguishes a changed repository selection", () => {
    expect(setupOutcome({ installation_id: "12345", setup_action: "update" })).toEqual({
      kind: "updated",
      installationId: 12345,
    })
  })

  it("does not treat a pending organisation request as an install", () => {
    // No installation_id is sent with a request, and none should be invented.
    expect(setupOutcome({ setup_action: "request" })).toEqual({ kind: "requested" })
  })

  it("still reports an install when the action string is unfamiliar", () => {
    // GitHub has renamed these before; the id is the part worth trusting.
    expect(setupOutcome({ installation_id: "77", setup_action: "something-new" })).toEqual({
      kind: "installed",
      installationId: 77,
    })
  })

  it("takes the first value when a parameter repeats", () => {
    expect(setupOutcome({ installation_id: ["9", "10"] })).toEqual({
      kind: "installed",
      installationId: 9,
    })
  })

  it.each([
    ["no parameters at all", {}],
    ["a non-numeric id", { installation_id: "abc" }],
    ["an injected id", { installation_id: "1; drop table" }],
    ["a negative id", { installation_id: "-4" }],
    ["a zero id", { installation_id: "0" }],
    ["a float", { installation_id: "1.5" }],
  ])("returns unknown for %s", (_label, params) => {
    expect(setupOutcome(params)).toEqual({ kind: "unknown" })
  })
})
