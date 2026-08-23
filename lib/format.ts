export function blobUrl(
  repo: { owner: string; name: string; defaultBranch: string },
  path: string,
  line: number,
): string {
  return `https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${path}#L${line}`
}

/**
 * Locale and time zone are pinned rather than taken from the host.
 *
 * `toLocaleDateString()` formats using whatever the runtime is set to, so the
 * server renders one string and the browser another, and React reports a
 * hydration mismatch. Fixing both inputs makes the two renders identical.
 *
 * The cost is that timestamps read in UTC rather than the viewer's zone, which
 * is why the time formatter says so.
 */
const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium" })

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDate(value: Date | string): string {
  return DATE.format(new Date(value))
}

export function formatDateTime(value: Date | string): string {
  return `${DATE_TIME.format(new Date(value))} UTC`
}
