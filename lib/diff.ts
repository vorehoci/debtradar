export interface DiffLine {
  /** Line number in whichever file version this line belongs to. */
  line: number
  /** Line content, without the leading `+` or `-`. */
  text: string
}

/**
 * Hunk headers look like `@@ -12,6 +14,9 @@ optional context`, capturing the
 * start line on the old side then the new side. Counts may be omitted when the
 * hunk covers a single line (`@@ -1 +1 @@`).
 */
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

type WalkedLine =
  | { kind: "added"; line: number; text: string }
  | { kind: "removed"; line: number; text: string }
  | { kind: "context" }

/**
 * Walks a unified diff, tracking a line counter for each side.
 *
 * A counter only advances for lines that exist on its own side: additions never
 * move the old counter, removals never move the new one, and context lines move
 * both. Advancing the wrong counter silently shifts every later line number.
 */
function* walk(patch: string): Generator<WalkedLine> {
  let oldLine = 0
  let newLine = 0

  for (const raw of patch.split("\n")) {
    const header = HUNK_HEADER.exec(raw)
    if (header) {
      oldLine = Number(header[1])
      newLine = Number(header[2])
      continue
    }

    // Anything before the first hunk header is preamble, not diff content.
    if (oldLine === 0 && newLine === 0) continue

    // `\ No newline at end of file` is a marker, not a line of either version.
    if (raw.startsWith("\\")) continue

    if (raw.startsWith("+")) {
      yield { kind: "added", line: newLine, text: raw.slice(1) }
      newLine++
    } else if (raw.startsWith("-")) {
      yield { kind: "removed", line: oldLine, text: raw.slice(1) }
      oldLine++
    } else {
      oldLine++
      newLine++
      yield { kind: "context" }
    }
  }
}

/** Lines this patch adds, numbered against the file after the change. */
export function parseAddedLines(patch: string): DiffLine[] {
  const added: DiffLine[] = []
  for (const entry of walk(patch)) {
    if (entry.kind === "added") added.push({ line: entry.line, text: entry.text })
  }
  return added
}

/**
 * Lines this patch removes, numbered against the file before the change.
 *
 * Used to detect resolution: a TODO comment appearing here is one that no
 * longer exists, which is far cheaper than rescanning the whole repository.
 */
export function parseRemovedLines(patch: string): DiffLine[] {
  const removed: DiffLine[] = []
  for (const entry of walk(patch)) {
    if (entry.kind === "removed") removed.push({ line: entry.line, text: entry.text })
  }
  return removed
}
