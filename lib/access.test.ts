import { afterEach, describe, expect, it, vi } from "vitest"

const paginate = vi.hoisted(() => vi.fn())
vi.mock("octokit", () => ({ Octokit: class { paginate = paginate } }))

afterEach(() => {
  paginate.mockReset()
  vi.resetModules()
})

async function freshModule() {
  return import("./access")
}

describe("accessibleInstallationIds", () => {
  it("only calls GitHub once for repeated lookups", async () => {
    const { accessibleInstallationIds } = await freshModule()
    paginate.mockResolvedValue([{ id: 1 }, { id: 2 }])

    expect(await accessibleInstallationIds("token-a")).toEqual([1, 2])
    expect(await accessibleInstallationIds("token-a")).toEqual([1, 2])
    expect(await accessibleInstallationIds("token-a")).toEqual([1, 2])

    // The whole point of the cache: three page renders, one network call.
    expect(paginate).toHaveBeenCalledTimes(1)
  })

  it("caches per token, not globally", async () => {
    const { accessibleInstallationIds } = await freshModule()
    paginate.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([{ id: 9 }])

    expect(await accessibleInstallationIds("token-a")).toEqual([1])
    expect(await accessibleInstallationIds("token-b")).toEqual([9])
    expect(paginate).toHaveBeenCalledTimes(2)
  })

  it("stops serving cached access once the token is rejected", async () => {
    const { accessibleInstallationIds, GitHubAuthError } = await freshModule()
    paginate.mockResolvedValueOnce([{ id: 1 }])
    expect(await accessibleInstallationIds("token-a")).toEqual([1])

    // Simulate the token expiring while a cache entry is still warm.
    vi.setSystemTime(Date.now() + 6 * 60 * 1000)
    paginate.mockRejectedValueOnce(Object.assign(new Error("bad"), { status: 401 }))

    await expect(accessibleInstallationIds("token-a")).rejects.toBeInstanceOf(GitHubAuthError)

    // And must not fall back to the stale entry on the next attempt.
    paginate.mockRejectedValueOnce(Object.assign(new Error("bad"), { status: 401 }))
    await expect(accessibleInstallationIds("token-a")).rejects.toBeInstanceOf(GitHubAuthError)
    vi.useRealTimers()
  })

  it("passes through non-auth failures untouched", async () => {
    const { accessibleInstallationIds, GitHubAuthError } = await freshModule()
    paginate.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }))

    await expect(accessibleInstallationIds("token-a")).rejects.not.toBeInstanceOf(GitHubAuthError)
  })
})
