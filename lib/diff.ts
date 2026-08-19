export interface AddedLine {
  /** Line number in the file as it exists after the change. */
  line: number
  /** Line content, without the leading `+`. */
  text: string
}

/**
 * Hunk headers look like `@@ -12,6 +14,9 @@ optional context`.
 * The capture is the starting line number on the new side; the count may be
 * omitted entirely when the hunk covers a single line (`@@ -1 +1 @@`).
 */
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Walks a unified diff and returns every added line with its real line number
 * in the post-change file.
 *
 * The counter only advances for lines that exist on the new side: additions and
 * context lines. Removed lines have no line number in the new file, so they are
 * skipped without incrementing.
 */
export function parseAddedLines(patch: string): AddedLine[] {
  const added: AddedLine[] = []
  let lineNumber = 0

  for (const raw of patch.split("\n")) {
    const header = HUNK_HEADER.exec(raw)
    if (header) {
      lineNumber = Number(header[1])
      continue
    }

    // Anything before the first hunk header is preamble, not diff content.
    if (lineNumber === 0) continue

    // `\ No newline at end of file` is a marker, not a line of either version.
    if (raw.startsWith("\\")) continue

    if (raw.startsWith("+")) {
      added.push({ line: lineNumber, text: raw.slice(1) })
      lineNumber++
    } else if (raw.startsWith("-")) {
      // Present only in the old file — no new-side line number to assign.
    } else {
      // Context line: unchanged, so it occupies a line on the new side too.
      lineNumber++
    }
  }

  return added
}
