import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// drizzle-kit runs outside Next, so .env.local is not loaded for it.
config({ path: ".env.local" })

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Migrations need the session-mode pooler (5432): transaction mode gives a
  // different backend per statement, which breaks migration advisory locks.
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
})
