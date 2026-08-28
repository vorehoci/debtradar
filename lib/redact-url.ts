/**
 * Query parameters safe to send to an analytics provider.
 *
 * An allow-list, not a block-list. The board grows filters regularly, and a
 * block-list silently leaks every one added after it was written — which is the
 * failure mode where nobody notices until the data is already gone.
 *
 * These four are enumerations the app itself defines, so they carry a choice
 * rather than anything a user typed. They are also the parameters worth having:
 * whether people use list view, and whether anybody touches the orphaned filter,
 * are real product questions.
 */
const SAFE_PARAMS = new Set(["view", "dismissed", "source", "orphaned"])

/**
 * Strips identifiers and free text out of a URL before it leaves the browser.
 *
 * Two things are removed, and the second matters more than the first.
 *
 * Numeric path segments are GitHub repository ids. `/repos/812734991/board`
 * would put a list of which repositories our users own into a third party's
 * system — something we never promised and would struggle to defend.
 *
 * The `q` parameter is free-text search across a private codebase. Whatever
 * somebody types to find a TODO — a file path, a function name, part of a
 * comment — is a fragment of source code we were trusted with. That is a
 * different order of mistake from leaking an id, and it is the reason this
 * allows parameters through by name rather than dropping known-bad ones.
 *
 * Anything unparseable is returned unchanged rather than guessed at: this runs
 * on every page view, and a redactor that throws would take analytics down.
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)

    parsed.pathname = parsed.pathname.replace(/\/\d+(?=\/|$)/g, "/[id]")

    for (const key of [...parsed.searchParams.keys()]) {
      if (!SAFE_PARAMS.has(key)) parsed.searchParams.delete(key)
    }

    return parsed.toString()
  } catch {
    return url
  }
}
