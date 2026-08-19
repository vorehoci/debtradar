export interface CommentSyntax {
  /** Prefixes that start a comment running to end of line. */
  line: string[]
  /** Delimiters for a comment that can span lines. */
  block?: readonly [open: string, close: string]
}

const C_STYLE: CommentSyntax = { line: ["//"], block: ["/*", "*/"] }
const HASH: CommentSyntax = { line: ["#"] }
const MARKUP: CommentSyntax = { line: [], block: ["<!--", "-->"] }

const BY_EXTENSION: Record<string, CommentSyntax> = {
  js: C_STYLE, jsx: C_STYLE, mjs: C_STYLE, cjs: C_STYLE,
  ts: C_STYLE, tsx: C_STYLE, mts: C_STYLE, cts: C_STYLE,
  java: C_STYLE, kt: C_STYLE, scala: C_STYLE, swift: C_STYLE,
  c: C_STYLE, h: C_STYLE, cpp: C_STYLE, hpp: C_STYLE, cc: C_STYLE,
  cs: C_STYLE, go: C_STYLE, rs: C_STYLE, php: C_STYLE, dart: C_STYLE,
  css: { line: [], block: ["/*", "*/"] },
  scss: C_STYLE, less: C_STYLE,

  py: HASH, rb: HASH, sh: HASH, bash: HASH, zsh: HASH,
  yml: HASH, yaml: HASH, toml: HASH, tf: HASH, r: HASH, pl: HASH,
  dockerfile: HASH,

  sql: { line: ["--"], block: ["/*", "*/"] },
  lua: { line: ["--"], block: ["--[[", "]]"] },
  hs: { line: ["--"], block: ["{-", "-}"] },

  html: MARKUP, xml: MARKUP, md: MARKUP, mdx: MARKUP,
  vue: MARKUP, svelte: MARKUP,
}

export function commentSyntaxFor(filename: string): CommentSyntax | undefined {
  const base = filename.split("/").pop() ?? filename
  if (base.toLowerCase() === "dockerfile") return HASH

  const extension = base.includes(".") ? base.split(".").pop()!.toLowerCase() : ""
  return BY_EXTENSION[extension]
}

/**
 * Returns the comment text on a line, or undefined if the line has none.
 *
 * This is deliberately lexical rather than a real parse: it does not track
 * string literals, so `const u = "a // b"` would be misread. Requiring a TODO
 * keyword (or an LLM pass) downstream filters most of that noise out.
 */
export function commentTextIn(text: string, syntax: CommentSyntax): string | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  // Continuation of a block comment, e.g. the middle lines of a JSDoc block.
  if (syntax.block && trimmed.startsWith("*") && !trimmed.startsWith("*/")) {
    return trimmed.slice(1).trim() || undefined
  }

  if (syntax.block) {
    const [open, close] = syntax.block
    const start = trimmed.indexOf(open)
    if (start !== -1) {
      let body = trimmed.slice(start + open.length)
      const end = body.indexOf(close)
      if (end !== -1) body = body.slice(0, end)
      return body.trim() || undefined
    }
  }

  for (const prefix of syntax.line) {
    let from = 0
    while (from <= trimmed.length) {
      const at = trimmed.indexOf(prefix, from)
      if (at === -1) break
      // Skip the `//` in a URL scheme rather than reading the rest as a comment.
      if (prefix === "//" && trimmed[at - 1] === ":") {
        from = at + prefix.length
        continue
      }
      return trimmed.slice(at + prefix.length).trim() || undefined
    }
  }

  return undefined
}
