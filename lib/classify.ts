import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { untrusted } from "./prompt"
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
  const list = candidates.map((c, i) => `${i}. ${c.file}:${c.line} — ${c.text}`).join("\n")

  // Both blocks are repository content. See lib/prompt.ts for why the tag
  // names carry a nonce rather than being written out plainly.
  return `${untrusted("diff", patches)}\n\n${untrusted("comments", list)}`
}

/**
 * Classifies comments the regex pass could not judge.
 *
 * The whole diff goes in one request rather than one call per comment: it is
 * cheaper, and the model needs the surrounding code to tell a real flag from an
 * ordinary explanation.
 */
/** Comments per request. Small enough to stay accurate, large enough to be cheap. */
const REPO_BATCH = 40

/**
 * Only the hits, with no justification.
 *
 * Returning a verdict for every comment meant paying for the model to explain,
 * in a sentence each, why roughly nine in ten comments were ordinary — and
 * output is priced five times input, so that explanation *was* the cost of the
 * feature. Omitting non-matches and dropping `reason` is the difference between
 * a scan you ration and one you can run over a whole repository.
 */
const FindingsSchema = z.object({
  findings: z.array(
    z.object({
      index: z.number().int().describe("Index of the comment from the numbered list"),
      category: z.enum(CATEGORIES),
      confidence: z.number().min(0).max(1),
    }),
  ),
})

export interface RepoFinding {
  index: number
  category: (typeof CATEGORIES)[number]
  confidence: number
}

/**
 * Classifies unmarked comments found by a whole-repository scan.
 *
 * Unlike the PR path this sends no surrounding code: a repository has tens of
 * thousands of comments, and shipping context for each would cost more than the
 * feature is worth. The trade is real — accuracy drops without the code a
 * comment sits above — so the confidence floor does more work here, and the
 * prompt says plainly that the code is absent.
 */
/**
 * A stricter floor than the pull-request path's 0.6.
 *
 * Measured on 200 unmarked comments from cal.com: the genuine finds scored
 * 0.80–0.95, while every false positive — documentation like "Expected format:
 * JSON object with username -> email mapping" — landed at 0.70–0.75. This path
 * sees no surrounding code, so it guesses more, and a padded backlog is the
 * exact failure this product exists to avoid.
 */
export const REPO_CONFIDENCE_FLOOR = 0.8

export async function classifyRepoComments(
  candidates: CommentCandidate[],
  // Both overridable so a prompt can be run against another model, or at
  // another threshold, and the results compared like for like.
  { model = "claude-haiku-4-5", floor = REPO_CONFIDENCE_FLOOR } = {},
): Promise<RepoFinding[]> {
  if (candidates.length === 0) return []

  const client = new Anthropic()

  // Batches are independent, and sequentially they dominate wall time: 500
  // batches at ~2.5s each is twenty minutes, well past what a job step can
  // hold. Five at a time keeps a whole repository inside a few minutes without
  // pushing hard enough to hit rate limits.
  const CONCURRENCY = 5

  const offsets: number[] = []
  for (let offset = 0; offset < candidates.length; offset += REPO_BATCH) offsets.push(offset)

  const classifyBatch = async (offset: number): Promise<RepoFinding[]> => {
    const batch = candidates.slice(offset, offset + REPO_BATCH)
    const list = batch.map((c, i) => `${i}. ${c.file}:${c.line} — ${c.text}`).join("\n")

    const response = await client.messages.parse({
      // Haiku for bulk triage: this is wording-only judgement over thousands of
      // comments, and the volume matters more than the last increment of
      // accuracy. Note `output_config.effort` is not accepted on Haiku 4.5 —
      // it is an Opus 4.5+ parameter — so only the format is set here.
      model,
      max_tokens: 4096,
      system: `${SYSTEM}

You are seeing comments without the code around them, so judge the wording
alone. When a comment could go either way without the code, leave it out rather
than guessing.

A TODO is work the author still owes. It is not an instruction to the reader.
Most comments in a codebase describe or label what the code does, and many of
those are phrased as imperatives — that grammar does not make them unfinished
work. In particular, these are NOT TODOs:

- steps and labels that narrate the code below them
  ("Use the pool instance created above", "Track connection status",
   "3. Create the Dialect, passing the configured pool")
- statements of behaviour ("Allows: HTTPS URLs, image data URLs")
- explanations of why existing code is the way it is

These ARE, because each admits something is unfinished or wrong:

- suppressions with a reason ("@ts-ignore - prisma type mismatch between versions")
- placeholders left in code ("REPLACE_ME_WITH_YOUR_HASH_KEY")
- migrations owed ("deprecated - use smtp with tasker instead")
- workarounds described as temporary

Return ONLY the comments that describe unfinished work. Omit every other
comment entirely — do not return an entry saying a comment is not a TODO, and do
not explain your reasoning. An empty list is the correct answer when nothing in
the batch qualifies, which is usual.`,
      output_config: { format: zodOutputFormat(FindingsSchema) },
      messages: [{ role: "user", content: untrusted("comments", list) }],
    })

    const parsed = response.parsed_output
    if (!parsed) return []

    return (
      parsed.findings
        .filter((finding) => batch[finding.index] !== undefined)
        .filter((finding) => finding.category !== "not-actionable")
        .filter((finding) => finding.confidence >= floor)
        // Re-index onto the full list so callers can map findings back.
        .map((finding) => ({ ...finding, index: offset + finding.index }))
    )
  }

  const found: RepoFinding[] = []
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const wave = await Promise.all(
      offsets.slice(i, i + CONCURRENCY).map((offset) =>
        // One failed batch must not lose the rest of a long scan.
        classifyBatch(offset).catch(() => [] as RepoFinding[]),
      ),
    )
    for (const findings of wave) found.push(...findings)
  }

  return found
}

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
