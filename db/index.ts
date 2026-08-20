import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("Missing env var: DATABASE_URL")
  return url
}

// `prepare: false` is required by Supabase's transaction pooler, which cannot
// hold prepared statements across pooled connections.
const client = postgres(connectionString(), { prepare: false })

export const db = drizzle(client, { schema })
