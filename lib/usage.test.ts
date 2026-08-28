import { describe, expect, it, vi } from "vitest"

// The module inserts into Postgres when an operation finishes; the tests care
// about what it would insert, not about a live database.
const insert = vi.fn()
vi.mock("@/db", () => ({
  db: { insert: () => ({ values: insert }) },
}))

const { costOf, recordScale, recordUsage, trackUsage } = await import("./usage")

const usage = (input: number, output: number, extra: object = {}) => ({
  input_tokens: input,
  output_tokens: output,
  ...extra,
})

describe("costOf", () => {
  it("prices Opus input and output at the published rates", () => {
    const cost = costOf("claude-opus-5", {
      requests: 1,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(cost).toBe(30)
  })

  it("prices cache reads at a tenth of input and writes at 1.25x", () => {
    const cost = costOf("claude-haiku-4-5", {
      requests: 1,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    })
    expect(cost).toBeCloseTo(1.35, 10)
  })

  it("returns null for a model with no published rate rather than guessing", () => {
    const cost = costOf("some-future-model", {
      requests: 1,
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(cost).toBeNull()
  })
})

describe("trackUsage", () => {
  it("writes one row per model, summing the calls made under it", async () => {
    insert.mockClear()

    await trackUsage({ operation: "deep-scan", repositoryId: 7, installationId: 3 }, async () => {
      recordUsage("claude-haiku-4-5", usage(1000, 100))
      recordUsage("claude-haiku-4-5", usage(2000, 200))
      recordUsage("claude-opus-5", usage(500, 50))
      recordScale({ commentsJudged: 400, linesScanned: 12_000 })
    })

    expect(insert).toHaveBeenCalledOnce()
    const rows = insert.mock.calls[0][0]
    expect(rows).toHaveLength(2)

    const haiku = rows.find((r: { model: string }) => r.model === "claude-haiku-4-5")
    expect(haiku).toMatchObject({
      operation: "deep-scan",
      repositoryId: 7,
      installationId: 3,
      requests: 2,
      inputTokens: 3000,
      outputTokens: 300,
      commentsJudged: 400,
      linesScanned: 12_000,
    })
    expect(haiku.costUsd).toBeCloseTo(0.0045, 10)
  })

  it("counts cache tokens separately from fresh input", async () => {
    insert.mockClear()

    await trackUsage({ operation: "scan-push" }, async () => {
      recordUsage(
        "claude-opus-5",
        usage(100, 10, { cache_read_input_tokens: 900, cache_creation_input_tokens: 40 }),
      )
    })

    expect(insert.mock.calls[0][0][0]).toMatchObject({
      inputTokens: 100,
      cacheReadTokens: 900,
      cacheWriteTokens: 40,
    })
  })

  it("records what a failing operation already spent, then rethrows", async () => {
    insert.mockClear()

    await expect(
      trackUsage({ operation: "deep-scan" }, async () => {
        recordUsage("claude-opus-5", usage(1000, 100))
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")

    expect(insert.mock.calls[0][0][0]).toMatchObject({ requests: 1, inputTokens: 1000 })
  })

  it("writes nothing when no model was called", async () => {
    insert.mockClear()
    await trackUsage({ operation: "deep-scan" }, async () => {})
    expect(insert).not.toHaveBeenCalled()
  })

  it("leaves a scale null when the caller has no figure for it", async () => {
    insert.mockClear()

    await trackUsage({ operation: "deep-scan" }, async () => {
      recordScale({ commentsJudged: 400, linesScanned: null })
      recordUsage("claude-haiku-4-5", usage(10, 1))
    })

    expect(insert.mock.calls[0][0][0]).toMatchObject({
      commentsJudged: 400,
      linesScanned: null,
    })
  })

  it("never lets a failed insert break the operation it was measuring", async () => {
    insert.mockClear()
    insert.mockRejectedValueOnce(new Error("database down"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await trackUsage({ operation: "deep-scan" }, async () => {
      recordUsage("claude-opus-5", usage(10, 1))
      return "the scan still finished"
    })

    expect(result).toBe("the scan still finished")
  })

  it("ignores calls made outside any tracked operation", async () => {
    insert.mockClear()
    recordUsage("claude-opus-5", usage(999, 999))
    recordScale({ commentsJudged: 5 })
    expect(insert).not.toHaveBeenCalled()
  })

  it("keeps concurrent operations' tallies apart", async () => {
    insert.mockClear()

    await Promise.all([
      trackUsage({ operation: "deep-scan", repositoryId: 1 }, async () => {
        recordUsage("claude-haiku-4-5", usage(100, 10))
        await new Promise((resolve) => setTimeout(resolve, 5))
        recordUsage("claude-haiku-4-5", usage(100, 10))
      }),
      trackUsage({ operation: "analyse-fix", repositoryId: 2 }, async () => {
        recordUsage("claude-opus-5", usage(50, 5))
      }),
    ])

    const rows = insert.mock.calls.flatMap((call) => call[0])
    expect(rows.find((r) => r.repositoryId === 1)).toMatchObject({
      requests: 2,
      inputTokens: 200,
    })
    expect(rows.find((r) => r.repositoryId === 2)).toMatchObject({
      requests: 1,
      inputTokens: 50,
    })
  })
})
