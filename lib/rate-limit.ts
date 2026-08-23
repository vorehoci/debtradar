/**
 * A fixed-window counter, held in the process.
 *
 * Keyed by installation rather than by user on purpose: the installation is the
 * unit that costs money, and a per-user cap is trivially bypassed by signing in
 * as somebody else on the same repository.
 *
 * Per-process means each server instance allows its own quota, and a restart
 * clears the counts — acceptable for a spend guard whose job is stopping a
 * runaway loop, not enforcing a billing contract. Anything stricter needs the
 * counter in Postgres.
 */
const windows = new Map<string, { count: number; resetAt: number }>()

export interface RateLimit {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

export function consume(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimit {
  const existing = windows.get(key)

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) }
  }

  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000)
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetInSeconds }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, resetInSeconds }
}

/** Test seam; also used to keep the map from growing without bound. */
export function resetRateLimits(): void {
  windows.clear()
}
