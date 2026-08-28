import { describe, expect, it } from "vitest"
import { redactUrl } from "./redact-url"

const at = (path: string) => redactUrl(`https://debtradar.io${path}`)

describe("redactUrl", () => {
  it("replaces a repository id with a placeholder", () => {
    expect(at("/repos/812734991")).toBe("https://debtradar.io/repos/[id]")
    expect(at("/repos/812734991/board")).toBe("https://debtradar.io/repos/[id]/board")
  })

  it("leaves paths with no id alone", () => {
    expect(at("/dashboard")).toBe("https://debtradar.io/dashboard")
    expect(at("/")).toBe("https://debtradar.io/")
  })

  it("does not mistake a numeric fragment inside a segment for an id", () => {
    expect(at("/repos/v2beta/board")).toBe("https://debtradar.io/repos/v2beta/board")
  })

  it("drops the search query, which can contain source code", () => {
    expect(at("/repos/1/board?q=refund%20double%20charge")).toBe(
      "https://debtradar.io/repos/[id]/board",
    )
  })

  it("keeps the filter parameters worth measuring", () => {
    expect(at("/repos/1/board?view=list&source=claude")).toBe(
      "https://debtradar.io/repos/[id]/board?view=list&source=claude",
    )
  })

  it("drops unknown parameters rather than assuming they are safe", () => {
    expect(at("/repos/1/board?view=list&token=secret")).toBe(
      "https://debtradar.io/repos/[id]/board?view=list",
    )
  })

  it("returns anything unparseable untouched instead of throwing", () => {
    expect(redactUrl("not a url")).toBe("not a url")
  })
})
