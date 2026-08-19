import { App } from "octokit"
import { commentSyntaxFor, commentTextIn } from "@/lib/comments"
import { parseAddedLines } from "@/lib/diff"

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: Buffer.from(process.env.GITHUB_PRIVATE_KEY_B64!, "base64").toString(),
  webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET! },
})

app.webhooks.on(
  ["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"],
  // `octokit` is already authenticated as this installation — no manual token exchange.
  async ({ payload, octokit }) => {
    const owner = payload.repository.owner.login
    const repo = payload.repository.name
    const number = payload.pull_request.number

    console.log(`\nPR #${number} "${payload.pull_request.title}" in ${payload.repository.full_name}`)

    // listFiles paginates at 30 by default and caps out at 3000 files per PR.
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    })

    console.log(`  ${files.length} file(s) changed`)

    for (const file of files) {
      // `patch` is omitted for binary files and for diffs GitHub considers too large.
      if (!file.patch) continue

      const syntax = commentSyntaxFor(file.filename)
      if (!syntax) continue

      for (const { line, text } of parseAddedLines(file.patch)) {
        const comment = commentTextIn(text, syntax)
        if (comment) console.log(`  ${file.filename}:${line}  ${comment}`)
      }
    }
  },
)

app.webhooks.on("push", ({ payload }) => {
  console.log("push:", payload.commits.length, "commits to", payload.ref)
})

export async function POST(req: Request) {
  const raw = await req.text()                       // raw body FIRST — never JSON.parse before verifying
  try {
    await app.webhooks.verifyAndReceive({
      id: req.headers.get("x-github-delivery")!,
      name: req.headers.get("x-github-event") as any,
      signature: req.headers.get("x-hub-signature-256")!,
      payload: raw,
    })
    return new Response("ok", { status: 200 })
  } catch (err) {
    console.error("webhook failed:", err)
    return new Response("invalid", { status: 400 })
  }
}