import { config } from "dotenv"
import SmeeClient from "smee-client"

// A wrapper rather than an inline npm script: `$VAR` does not expand in npm
// scripts on Windows, so reading the channel from the environment needs Node.
config({ path: ".env.local" })

const source = process.env.SMEE_URL
if (!source) {
  console.error(
    "Missing SMEE_URL in .env.local — create a channel at https://smee.io and paste the URL.",
  )
  process.exit(1)
}

const port = process.env.PORT ?? "3000"

new SmeeClient({
  source,
  target: `http://localhost:${port}/api/webhooks/github`,
  logger: console,
}).start()
