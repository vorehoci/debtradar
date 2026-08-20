import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import type { CommentCandidate } from "./todos"

export const CATEGORIES = [
  "hidden-todo",
  "hack-workaround",
  "deferred-decision",
  "not-actionable",
] as const

const VerdictSchema = z.object({
  index: z.number().int().describe("Index of the comment from the numbered list"),
  isTodo: z.boolean().describe("True if the comment describes unfinished work"),
  category: z.enum(CATEGORIES),
  confidence: z.number().min(0).max(1),
  reason: z.string().describe("One short sentence justifying the verdict"),
})

const ResponseSchema = z.object({ verdicts: z.array(VerdictSchema) })

export type Verdict = z.infer<typeof VerdictSchema>

/** Verdicts below this are treated as noise and dropped. */
export const CONFIDENCE_FLOOR = 0.6

const SYSTEM = `You review pull request diffs for unfinished work.

You are given a diff, then a numbered list of comments it adds that carry no
conventional marker (TODO, FIXME, HACK...). Judge each one.

A comment is unfinished work when it flags a known issue, a workaround, a
deferred decision, or something the author means to return to. A comment that
only explains what the code does is not, however hedged its wording.

Use the surrounding diff — identical wording can be a genuine flag or an
ordinary explanation depending on the code it sits above. Return exactly one
verdict per numbered comment, and be strict: over-reporting makes the backlog
useless.`

function buildPrompt(candidates: CommentCandidate[], patches: string): string {
  const list = candidates
    .map((c, i) => `${i}. ${c.file}:${c.line} — ${c.text}`)
    .join("\n")

  return `<diff>\n${patches}\n</diff>\n\n<comments>\n${list}\n</comments>`
}

/**
 * Classifies comments the regex pass could not judge.
 *
 * The whole diff goes in one request rather than one call per comment: it is
 * cheaper, and the model needs the surrounding code to tell a real flag from an
 * ordinary explanation.
 */
export async function classifyUnmarked(
  candidates: CommentCandidate[],
  files: { filename: string; patch?: string }[],
): Promise<Verdict[]> {
  // No unmarked comments means no reason to spend a request.
  if (candidates.length === 0) return []

  const patches = files
    .filter((f) => f.patch)
    .map((f) => `--- ${f.filename}\n${f.patch}`)
    .join("\n\n")

  const client = new Anthropic()

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: SYSTEM,
    // Classification is shallow work; `low` keeps latency and cost down.
    output_config: {
      effort: "low",
      format: zodOutputFormat(ResponseSchema),
    },
    messages: [{ role: "user", content: buildPrompt(candidates, patches) }],
  })

  const parsed = response.parsed_output
  if (!parsed) throw new Error("Classifier returned no parseable output")

  return parsed.verdicts.filter(
    (v) => v.isTodo && v.confidence >= CONFIDENCE_FLOOR && candidates[v.index] !== undefined,
  )
}
