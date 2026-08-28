import { AsyncLocalStorage } from "node:async_hooks"
import { modelUsage } from "@/db/schema"

/**
 * Per-million-token rates, in US dollars, as published on 2026-08-28.
 *
 * Cache writes are billed at 1.25x the input rate and cache reads at 0.1x. The
 * multipliers are written out rather than computed so that a future model with
 * different cache economics can simply state its own numbers.
 *
 * A model missing from this table is not an error: its tokens are still
 * recorded and its cost is left null, which is honest. Guessing a rate would
 * put a number in the column that nobody could later tell apart from a measured
 * one.
 */
const PRICES: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
}

/** The fields of an Anthropic response's `usage` that carry a price. */
export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

interface Totals {
  requests: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

interface Scale {
  commentsJudged: number | null
  linesScanned: number | null
}

interface Store {
  operation: string
  repositoryId: number | null
  installationId: number | null
  startedAt: number
  byModel: Map<string, Totals>
  scale: Scale
}

const storage = new AsyncLocalStorage<Store>()

/** Dollars for one model's tally, or null when the model has no published rate. */
export function costOf(model: string, totals: Totals): number | null {
  const price = PRICES[model]
  if (!price) return null

  return (
    (totals.inputTokens * price.input +
      totals.outputTokens * price.output +
      totals.cacheWriteTokens * price.cacheWrite +
      totals.cacheReadTokens * price.cacheRead) /
    1_000_000
  )
}

/**
 * Adds one API response's usage to whatever operation is in progress.
 *
 * Outside a `trackUsage` block this does nothing at all. That is deliberate:
 * the model calls are reachable from tests, scripts, and one-off REPL work, and
 * none of those should be writing rows to a cost ledger. Only a caller that has
 * declared what operation it is performing gets measured.
 */
export function recordUsage(model: string, usage: TokenUsage): void {
  const store = storage.getStore()
  if (!store) return

  const totals = store.byModel.get(model) ?? {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }

  totals.requests += 1
  totals.inputTokens += usage.input_tokens
  totals.outputTokens += usage.output_tokens
  totals.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
  totals.cacheReadTokens += usage.cache_read_input_tokens ?? 0

  store.byModel.set(model, totals)
}

/**
 * Records how big this unit of work was, so cost per line and per comment can
 * be computed later. Callers that do not know their size can skip it.
 */
export function recordScale(scale: Partial<Scale>): void {
  const store = storage.getStore()
  if (!store) return

  // `null` means "I have no figure for this", not "zero" — a caller that
  // genuinely has nothing to report must leave the column null rather than
  // asserting a repository is empty.
  if (scale.commentsJudged != null) {
    store.scale.commentsJudged = (store.scale.commentsJudged ?? 0) + scale.commentsJudged
  }
  if (scale.linesScanned != null) {
    store.scale.linesScanned = (store.scale.linesScanned ?? 0) + scale.linesScanned
  }
}

/**
 * Runs `fn` as one measurable operation, then writes what it spent.
 *
 * The flush is awaited rather than fired and forgotten, because on serverless
 * the instance is frozen the moment the handler returns and a pending insert
 * simply never lands. It is awaited in a `finally` so that a failed scan still
 * records the tokens it burned before failing — a run that costs money and then
 * throws is exactly the run worth knowing about.
 *
 * Nothing here can fail the caller. A cost ledger that can break a scan is a
 * worse thing than a cost ledger with a gap in it.
 */
export async function trackUsage<T>(
  context: { operation: string; repositoryId?: number | null; installationId?: number | null },
  fn: () => Promise<T>,
): Promise<T> {
  const store: Store = {
    operation: context.operation,
    repositoryId: context.repositoryId ?? null,
    installationId: context.installationId ?? null,
    startedAt: Date.now(),
    byModel: new Map(),
    scale: { commentsJudged: null, linesScanned: null },
  }

  try {
    return await storage.run(store, fn)
  } finally {
    await flush(store)
  }
}

async function flush(store: Store): Promise<void> {
  if (store.byModel.size === 0) return

  const durationMs = Date.now() - store.startedAt
  const rows = [...store.byModel].map(([model, totals]) => ({
    operation: store.operation,
    repositoryId: store.repositoryId,
    installationId: store.installationId,
    model,
    ...totals,
    costUsd: costOf(model, totals),
    durationMs,
    commentsJudged: store.scale.commentsJudged,
    linesScanned: store.scale.linesScanned,
  }))

  try {
    // Imported here rather than at the top of the file: `db` opens a connection
    // as a side effect of being imported, and this module is pulled in by every
    // module that calls a model. Nothing should need a database just to be
    // loaded — including a test that never records anything.
    const { db } = await import("@/db")
    await db.insert(modelUsage).values(rows)
  } catch (error) {
    console.error("usage: failed to record model spend", error)
  }
}
