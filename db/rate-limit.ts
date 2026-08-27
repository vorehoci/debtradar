import { sql } from "drizzle-orm"
import { db } from "./index"

export interface RateLimit {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Claims one slot in a fixed window, or refuses.
 *
 * Keyed by installation rather than by user: the installation is the unit that
 * costs money, and a per-user cap is trivially bypassed by signing in as
 * somebody else on the same repository.
 *
 * One statement, deliberately. Read-then-write would let two concurrent
 * requests both read a count of two, both decide they were under a limit of
 * three, and both proceed — which is exactly the case a limit exists for, and
 * exactly the case a serverless platform makes common by running requests on
 * separate instances. The upsert below decides and increments atomically, so
 * the database is the only thing that ever has an opinion about the count.
 *
 * Every timestamp comes from `now()` on the server rather than from the caller.
 * Instances share no clock, and two of them disagreeing about when a window
 * closes is how a limit becomes a suggestion.
 *
 * A refused call still increments. That is intentional for a fixed window:
 * hammering the endpoint cannot shorten the wait, and the window still expires
 * on schedule because `reset_at` is only moved when it has actually passed.
 */
export async function consume(key: string, limit: number, windowMs: number): Promise<RateLimit> {
  const seconds = Math.ceil(windowMs / 1000)

  const rows = await db.execute<{ count: number; reset_in: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${seconds}))
    on conflict (key) do update set
      count = case
        when rate_limits.reset_at <= now() then 1
        else rate_limits.count + 1
      end,
      reset_at = case
        when rate_limits.reset_at <= now() then now() + make_interval(secs => ${seconds})
        else rate_limits.reset_at
      end
    returning
      count,
      ceil(extract(epoch from (reset_at - now())))::int as reset_in
  `)

  const row = rows[0]

  // A write that returns nothing should not hand out a free pass: failing open
  // on the one guard that bounds spend is worse than refusing a legitimate
  // scan, which the reader can retry.
  if (!row) return { allowed: false, remaining: 0, resetInSeconds: seconds }

  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    resetInSeconds: Math.max(0, row.reset_in),
  }
}
