import { commentSyntaxFor, commentTextIn } from "./comments"
import { parseAddedLines } from "./diff"

export interface CommentCandidate {
  file: string
  /** Line number in the file after the change. */
  line: number
  /** The comment body, with the syntax stripped. */
  text: string
  /**
   * The conventional marker that flagged this, uppercased — or null when the
   * regex pass found nothing. Nulls are the input to the LLM classifier, which
   * decides whether an unmarked comment still describes unfinished work.
   */
  marker: string | null
}

const MARKERS = ["TODO", "FIXME", "HACK", "XXX", "BUG", "OPTIMIZE", "REFACTOR"] as const

const MARKER_PATTERN = new RegExp(`\\b(${MARKERS.join("|")})\\b`, "gi")

/**
 * Finds a conventional TODO marker in a comment body.
 *
 * A match counts when it either opens the comment (`// todo: fix this`) or is
 * written in caps (`// this is a TODO`). That rules out ordinary prose — "fixes
 * the bug where…" mentions a marker word but is not a marker.
 */
export function markerIn(comment: string): string | null {
  for (const match of comment.matchAll(MARKER_PATTERN)) {
    const word = match[0]
    const opensComment = match.index === 0
    const isShouted = word === word.toUpperCase()
    if (opensComment || isShouted) return word.toUpperCase()
  }
  return null
}

/** Every comment added by this patch, each tagged with its marker or null. */
export function scanPatch(filename: string, patch: string): CommentCandidate[] {
  const syntax = commentSyntaxFor(filename)
  if (!syntax) return []

  const found: CommentCandidate[] = []
  for (const { line, text } of parseAddedLines(patch)) {
    const comment = commentTextIn(text, syntax)
    if (!comment) continue
    found.push({ file: filename, line, text: comment, marker: markerIn(comment) })
  }
  return found
}

export function scanFiles(files: { filename: string; patch?: string }[]): CommentCandidate[] {
  return files.flatMap((file) => (file.patch ? scanPatch(file.filename, file.patch) : []))
}
