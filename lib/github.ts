import { App } from "octokit"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

let cached: App | undefined

export function githubApp(): App {
  cached ??= new App({
    appId: required("GITHUB_APP_ID"),
    // The .pem is multi-line, so it is stored base64-encoded in the environment.
    privateKey: Buffer.from(required("GITHUB_PRIVATE_KEY_B64"), "base64").toString("utf8"),
    webhooks: { secret: required("GITHUB_WEBHOOK_SECRET") },
  })
  return cached
}

/**
 * An Octokit client authenticated as one installation.
 *
 * The webhook handler gets this handed to it, but a background job only has the
 * installation id from the event, so it mints its own.
 */
export function installationClient(installationId: number) {
  return githubApp().getInstallationOctokit(installationId)
}
