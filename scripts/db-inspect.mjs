// Row counts for every table in the public schema, for confirming what a
// destructive operation is about to remove. Read-only.
import postgres from "postgres"

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) throw new Error("Missing DIRECT_URL or DATABASE_URL")
const sql = postgres(url, { prepare: false })

const [{ db }] = await sql`select current_database() as db`
console.log(`database: ${db}\n`)

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`

for (const { table_name } of tables) {
  const [{ count }] = await sql`select count(*)::int as count from ${sql(table_name)}`
  console.log(`${String(count).padStart(8)}  ${table_name}`)
}

await sql.end()
