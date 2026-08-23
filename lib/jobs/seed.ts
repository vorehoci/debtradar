import { ensureRepository, type FoundTodo, recordScan } from "@/db/repository"
import { installationClient } from "@/lib/github"
import { enrichRequested, inngest, seedRequested } from "@/lib/inngest"
import { eachSourceFile } from "@/lib/tarball"
import { scanSource } from "@/lib/todos"

export const seedRepository = inngest.createFunction(
  {
    id: "seed-repository",
    triggers: [seedRequested],
    retries: 2,
    // One repository at a time: a seed downloads and decompresses a whole repo.
    concurrency: 1,
  },
  async ({ event, step }) => {
    const { installationId, accountLogin, repositoryId, owner, repo } = event.data

    const result = await step.run("scan-tarball", async () => {
      const octokit = await installationClient(installationId)

      const { data: metadata } = await octokit.rest.repos.get({ owner, repo })
      const defaultBranch = metadata.default_branch

      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      })
      const headSha = ref.object.sha

      // Only file contents are held briefly, one at a time; nothing but the
      // matched comments survives the callback, so peak memory stays modest
      // even for a large repository.
      const found: FoundTodo[] = []
      const counts = await eachSourceFile(
        octokit,
        { owner, repo, ref: headSha },
        ({ path, source }) => {
          // Regex markers only. Classifying every comment in an entire
          // repository would cost real money before the user sees a result.
          for (const comment of scanSource(path, source)) {
            if (comment.marker) found.push(comment)
          }
        },
      )

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

      return { ...persisted, headSha, ...counts }
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
      `\nseeded ${owner}/${repo} — ${result.seen} TODO(s) from ` +
        `${result.scanned} scannable file(s), ${result.skipped} skipped`,
    )

    return result
  },
)
