import { describe, expect, it } from "vitest"
import { contextWindow } from "./fix-analysis"

const source = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join("\n")

describe("contextWindow", () => {
  it("keeps real line numbers so the model can cite them", () => {
    const window = contextWindow({ path: "a.ts", line: 100, source }, 2)
    expect(window).toBe("98\tline 98\n99\tline 99\n100\tline 100\n101\tline 101\n102\tline 102")
  })

  it("does not run off the start of the file", () => {
    const window = contextWindow({ path: "a.ts", line: 2, source }, 10)
    expect(window.split("\n")[0]).toBe("1\tline 1")
  })

  it("does not run off the end of the file", () => {
    const window = contextWindow({ path: "a.ts", line: 199, source }, 10)
    expect(window.split("\n").at(-1)).toBe("200\tline 200")
  })

  it("bounds the request rather than sending a whole large file", () => {
    const window = contextWindow({ path: "a.ts", line: 100, source }, 5)
    expect(window.split("\n")).toHaveLength(11)
  })
})
