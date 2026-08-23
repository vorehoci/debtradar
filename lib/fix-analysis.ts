import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import type { Octokit } from "octokit"
import { z } from "zod"

export const FIX_SCOPES = ["single-file", "multi-file", "needs-decision"] as const
export type FixScope = (typeof FIX_SCOPES)[number]

const AnalysisSchema = z.object({
  fixable: z
    .boolean()
    .describe("True only if a competent developer could act on this without new information"),
  scope: z.enum(FIX_SCOPES).describe("How far the change would reach"),
  summary: z
    .string()
    .describe("One or two sentences describing the change in prose. No code."),
  confidence: z.number().min(0).max(1),
})

export type FixAnalysis = z.infer<typeof AnalysisSchema>

/**
 * Lines of surrounding code sent with the comment.
 *
 * Enough to see the function a TODO sits in; small enough that the request
 * stays a few thousand tokens rather than a whole large file.
 */
const CONTEXT_LINES = 60

/** Files past this are generated or vendored, and not worth reasoning about. */
const MAX_FILE_BYTES = 400_000

const SYSTEM = `You assess whether a TODO comment in a codebase can be acted on.

You are given a comment, the file it lives in, and the surrounding code. Decide:

- fixable: can a developer act on this from what is here, without a product
  decision, missing context, or an answer only the original author has?
- scope: "single-file" if the change stays in this file; "multi-file" if it
  would touch others; "needs-decision" if someone must choose something first.
- summary: one or two sentences, in prose, describing what the change would be.
  Never write code. Never restate the comment back.
- confidence: how sure you are.

Be strict. A comment saying work is needed is not the same as a comment with
enough information to do the work. "needs-decision" is the honest answer more
often than it feels, and calling something fixable when it is not wastes more of
a developer's time than saying so.`

export interface FileContext {
  path: string
  /** The comment's line number, 1-based. */
  line: number
  source: string
}

/** Narrows a file to a window around the comment, keeping real line numbers. */
export function contextWindow(context: FileContext, radius = CONTEXT_LINES): string {
  const lines = context.source.split("\n")
  const from = Math.max(0, context.line - 1 - radius)
  const to = Math.min(lines.length, context.line + radius)

  return lines
    .slice(from, to)
    .map((text, index) => `${from + index + 1}\t${text}`)
    .join("\n")
}

/** Reads a file at a commit, or null when it is missing, binary, or huge. */
export async function fetchFile(
  octokit: Octokit,
  params: { owner: string; repo: string; path: string; ref: string },
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent(params)
    if (Array.isArray(data) || data.type !== "file") return null
    if (data.size > MAX_FILE_BYTES) return null
    return Buffer.from(data.content, "base64").toString("utf8")
  } catch {
    // A path that has moved since the last scan is an ordinary miss.
    return null
  }
}

export async function analyseFix(params: {
  comment: string
  marker: string | null
  context: FileContext
}): Promise<FixAnalysis> {
  const client = new Anthropic()

  const prompt = [
    `<comment marker="${params.marker ?? "none"}" file="${params.context.path}" line="${params.context.line}">`,
    params.comment,
    "</comment>",
    "",
    `<code path="${params.context.path}">`,
    contextWindow(params.context),
    "</code>",
  ].join("\n")

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    system: SYSTEM,
    // Judging fixability needs real reading of the surrounding code, so this
    // gets more effort than the bulk comment classifier.
    output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
    messages: [{ role: "user", content: prompt }],
  })

  const parsed = response.parsed_output
  if (!parsed) throw new Error("Fix analysis returned no parseable output")
  return parsed
}
