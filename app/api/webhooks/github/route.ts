import { githubApp } from "@/lib/github"
import { inngest, pushReceived, scanRequested, seedRequested } from "@/lib/inngest"

const app = githubApp()

/**
 * Seeding on install is what makes a mature repository show anything at all —
 * the diff scanners only ever see changed lines, so without this a new
 * installation looks empty until someone happens to touch a file.
 */
async function seedAll(
  installationId: number,
  accountLogin: string,
  repos: { id: number; name: string }[],
) {
  if (repos.length === 0) return
  await inngest.send(
    repos.map((repo) =>
      seedRequested.create({
        installationId,
        accountLogin,
        repositoryId: repo.id,
        owner: accountLogin,
        repo: repo.name,
      }),
    ),
  )
}

app.webhooks.on("installation.created", async ({ payload }) => {
  const account = payload.installation.account
  const login = account && "login" in account ? account.login : undefined
  if (!login) return

  console.log(`[installed] on ${payload.repositories?.length ?? 0} repo(s) for ${login}`)
  await seedAll(payload.installation.id, login, payload.repositories ?? [])
})

app.webhooks.on("installation_repositories.added", async ({ payload }) => {
  const account = payload.installation.account
  const login = account && "login" in account ? account.login : undefined
  if (!login) return

  await seedAll(payload.installation.id, login, payload.repositories_added ?? [])
})

app.webhooks.on(
  ["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"],
  async ({ payload }) => {
    // Present on every event from an installed app, but optional in the type.
    if (!payload.installation) return

    // Hand off and return: scanning a large diff takes far longer than the
    // ~10s GitHub allows before it marks the delivery failed.
    await inngest.send(
      scanRequested.create({
        installationId: payload.installation.id,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        pullNumber: payload.pull_request.number,
        headSha: payload.pull_request.head.sha,
        title: payload.pull_request.title,
      }),
    )
  },
)

/** A branch that was just created or deleted has an all-zero sha on one side. */
const EMPTY_SHA = "0".repeat(40)

app.webhooks.on("push", async ({ payload }) => {
  if (!payload.installation) return

  // Only the default branch is real debt; other branches are proposals.
  const defaultBranch = payload.repository.default_branch
  if (payload.ref !== `refs/heads/${defaultBranch}`) return
  if (payload.before === EMPTY_SHA || payload.after === EMPTY_SHA) return

  // Typed as nullable, but absent only for repositories we could not act on anyway.
  const owner = payload.repository.owner?.login ?? payload.repository.owner?.name
  if (!owner) return

  await inngest.send(
    pushReceived.create({
      installationId: payload.installation.id,
      accountLogin: owner,
      repositoryId: payload.repository.id,
      owner,
      repo: payload.repository.name,
      defaultBranch,
      beforeSha: payload.before,
      afterSha: payload.after,
    }),
  )
})

export async function POST(req: Request) {
  // Read the raw body first: the signature is an HMAC over these exact bytes,
  // so parsing before verifying would make the check fail.
  const raw = await req.text()

  try {
    await app.webhooks.verifyAndReceive({
      id: req.headers.get("x-github-delivery")!,
      name: req.headers.get("x-github-event") as never,
      signature: req.headers.get("x-hub-signature-256")!,
      payload: raw,
    })
    return new Response("ok", { status: 200 })
  } catch (err) {
    console.error("[webhook] rejected:", err)
    return new Response("invalid signature", { status: 400 })
  }
}
