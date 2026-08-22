import { ensureRepository, type FoundTodo, recordScan } from "@/db/repository"
import { commentSyntaxFor } from "@/lib/comments"
import { installationClient } from "@/lib/github"
import { enrichRequested, inngest, seedRequested } from "@/lib/inngest"
import { scanSource } from "@/lib/todos"

/** Guards against a first scan that takes an hour and burns the rate limit. */
const MAX_FILES = 2_000
const MAX_FILE_BYTES = 400_000
/** Blobs are fetched one request each, so a little concurrency matters. */
const BATCH = 10

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export const seedRepository = inngest.createFunction(
  {
    id: "seed-repository",
    triggers: [seedRequested],
    retries: 2,
    // One repository at a time: a seed is hundreds of API calls.
    concurrency: 1,
  },
  async ({ event, step }) => {
    const { installationId, accountLogin, repositoryId, owner, repo } = event.data

    const result = await step.run("scan-tree", async () => {
      const octokit = await installationClient(installationId)

      const { data: metadata } = await octokit.rest.repos.get({ owner, repo })
      const defaultBranch = metadata.default_branch

      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      })
      const headSha = ref.object.sha

      // One request for the entire file listing, rather than walking directories.
      const { data: tree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: headSha,
        recursive: "1",
      })

      const files = tree.tree
        .filter(
          (entry) =>
            entry.type === "blob" &&
            entry.path &&
            entry.sha &&
            (entry.size ?? 0) <= MAX_FILE_BYTES &&
            commentSyntaxFor(entry.path),
        )
        .slice(0, MAX_FILES)

      const found: FoundTodo[] = []
      for (const batch of chunk(files, BATCH)) {
        const scanned = await Promise.all(
          batch.map(async (entry) => {
            const { data: blob } = await octokit.rest.git.getBlob({
              owner,
              repo,
              file_sha: entry.sha!,
            })
            const source = Buffer.from(blob.content, "base64").toString("utf8")
            return scanSource(entry.path!, source)
          }),
        )
        // Regex markers only. Classifying every comment in an entire repository
        // would cost real money before the user has seen a single result.
        for (const comments of scanned) {
          found.push(...comments.filter((c) => c.marker))
        }
      }

      await ensureRepository({
        installationId,
        accountLogin,
        repositoryId,
        owner,
        name: repo,
        defaultBranch,
      })

      // No `removed`: a seed observes a snapshot and cannot resolve anything.
      const persisted = await recordScan({ repositoryId, sha: headSha, found, removed: [] })

      return {
        ...persisted,
        headSha,
        filesScanned: files.length,
        treeTruncated: Boolean(tree.truncated),
      }
    })

    await step.sendEvent("request-enrichment", [
      enrichRequested.create({
        installationId,
        repositoryId,
        owner,
        repo,
        ref: result.headSha,
      }),
    ])

    console.log(
      `\nseeded ${owner}/${repo} — ${result.seen} TODO(s) across ` +
        `${result.filesScanned} file(s)${result.treeTruncated ? " (tree truncated)" : ""}`,
    )

    return result
  },
)
