import { describe, expect, it } from "vitest"
import { checkOutput, conclusion } from "./checks"
import type { CommentCandidate } from "./todos"

const repo = { owner: "vorehoci", name: "helpmyvibe" }
const sha = "abc1234"

const todo = (over: Partial<CommentCandidate> = {}): CommentCandidate => ({
  file: "src/auth.ts",
  line: 12,
  text: "TODO: handle expiry",
  marker: "TODO",
  ...over,
})

describe("conclusion", () => {
  it("never blocks a pull request for adding TODOs", () => {
    expect(conclusion(5, 0)).toBe("neutral")
    expect(conclusion(1, 0)).toBe("neutral")
  })

  it("passes when nothing was added or the balance improved", () => {
    expect(conclusion(0, 0)).toBe("success")
    expect(conclusion(0, 3)).toBe("success")
    expect(conclusion(2, 2)).toBe("success")
    expect(conclusion(1, 4)).toBe("success")
  })
})

describe("checkOutput", () => {
  it("titles the net effect", () => {
    expect(checkOutput({ added: [todo()], resolved: [], repo, sha }).title).toBe("Adds 1 TODO")
    expect(checkOutput({ added: [todo(), todo()], resolved: [], repo, sha }).title).toBe(
      "Adds 2 TODOs",
    )
    expect(checkOutput({ added: [], resolved: [todo()], repo, sha }).title).toBe("Resolves 1 TODO")
    expect(checkOutput({ added: [todo()], resolved: [todo()], repo, sha }).title).toBe(
      "Adds 1, resolves 1",
    )
  })

  it("links each entry to the line at this commit", () => {
    const { summary } = checkOutput({ added: [todo()], resolved: [], repo, sha })
    expect(summary).toContain(
      "https://github.com/vorehoci/helpmyvibe/blob/abc1234/src/auth.ts#L12",
    )
    expect(summary).toContain("TODO: handle expiry")
  })

  it("says so plainly when there is nothing to report", () => {
    const { title, summary } = checkOutput({ added: [], resolved: [], repo, sha })
    expect(title).toBe("No TODOs added or resolved")
    expect(summary).toContain("neither adds nor resolves")
  })
})
