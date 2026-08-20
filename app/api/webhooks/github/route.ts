import { githubApp } from "@/lib/github"
import { inngest, scanRequested } from "@/lib/inngest"

const app = githubApp()

app.webhooks.on("installation.created", ({ payload }) => {
  const repos = payload.repositories?.map((r) => r.full_name).join(", ") ?? "none"
  console.log(`[installed] on ${repos}`)
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
