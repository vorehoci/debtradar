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

let installUrl: string | undefined

/**
 * Where a signed-in user goes to install the app on their account.
 *
 * The URL is built from the app's slug, which is asked of GitHub rather than
 * kept in an environment variable: the slug is derived from the app's name and
 * changes if the app is renamed, so a hardcoded copy would send people to a 404
 * at exactly the moment they were trying to sign up.
 *
 * Cached for the life of the process — one request, and the answer only changes
 * on a rename.
 */
export async function appInstallUrl(): Promise<string> {
  if (installUrl) return installUrl

  const { data } = await githubApp().octokit.rest.apps.getAuthenticated()
  if (!data) throw new Error("GitHub did not return the app")

  // `html_url` is the app's public page; GitHub appends the install flow to it.
  installUrl = `${data.html_url}/installations/new`
  return installUrl
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
