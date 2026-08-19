import { App } from "octokit"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

// The .pem is multi-line, so it is stored base64-encoded in the environment.
function privateKey(): string {
  return Buffer.from(required("GITHUB_PRIVATE_KEY_B64"), "base64").toString("utf8")
}

let cached: App | undefined

export function githubApp(): App {
  cached ??= new App({
    appId: required("GITHUB_APP_ID"),
    privateKey: privateKey(),
    webhooks: { secret: required("GITHUB_WEBHOOK_SECRET") },
  })
  return cached
}
