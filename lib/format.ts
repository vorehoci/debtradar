const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Coarse relative age — "3 days", "2 months". Precision past a day is noise here. */
export function age(from: Date | null): string {
  if (!from) return "unknown"

  const elapsed = Date.now() - from.getTime()
  if (elapsed < HOUR) return `${Math.max(1, Math.round(elapsed / MINUTE))}m`
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)}h`

  const days = Math.round(elapsed / DAY)
  if (days < 31) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`

  const years = days / 365
  return `${years < 2 ? years.toFixed(1) : Math.round(years)}y`
}

export function blobUrl(
  repo: { owner: string; name: string; defaultBranch: string },
  path: string,
  line: number,
): string {
  return `https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${path}#L${line}`
}
