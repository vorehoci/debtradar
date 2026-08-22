import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("Missing env var: DATABASE_URL")
  return url
}

// Hot reload re-evaluates modules, so without this every edit would open a new
// pool and exhaust the connection limit within a few saves.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>
}

// `prepare: false` is required by Supabase's transaction pooler, which cannot
// hold prepared statements across pooled connections.
const client = globalForDb.client ?? postgres(connectionString(), { prepare: false })
if (process.env.NODE_ENV !== "production") globalForDb.client = client

export const db = drizzle(client, { schema })
