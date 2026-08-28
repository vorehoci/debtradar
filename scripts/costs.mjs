// What the model calls have cost, sliced the three ways that decide pricing:
// per operation, per repository, and per unit of work. Read-only.
import postgres from "postgres"

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) throw new Error("Missing DIRECT_URL or DATABASE_URL")
const sql = postgres(url, { prepare: false })

const days = Number(process.argv[2] ?? 30)
const since = sql`now() - make_interval(days => ${days})`

const money = (n) => (n === null ? "     —" : `$${Number(n).toFixed(4)}`.padStart(10))
const num = (n) => (n === null ? "—" : Number(n).toLocaleString("en-US"))

console.log(`\nlast ${days} day(s)\n`)

const byOperation = await sql`
  select operation, model,
         count(*)::int as runs,
         sum(requests)::int as requests,
         sum(input_tokens)::bigint as input,
         sum(output_tokens)::bigint as output,
         sum(cost_usd) as cost,
         avg(cost_usd) as avg_cost,
         percentile_cont(0.5) within group (order by cost_usd) as median_cost
  from model_usage where created_at > ${since}
  group by operation, model order by sum(cost_usd) desc nulls last`

console.log("BY OPERATION")
for (const r of byOperation) {
  console.log(
    `  ${r.operation.padEnd(12)} ${r.model.padEnd(18)} ` +
      `${String(r.runs).padStart(6)} runs  ${money(r.cost)} total  ` +
      `${money(r.avg_cost)} mean  ${money(r.median_cost)} median`,
  )
  console.log(`  ${" ".repeat(31)} ${num(r.input)} in / ${num(r.output)} out tokens`)
}

// The number the pricing decision actually turns on: a whole deep scan of one
// repository, which is many rows, against how big that repository was.
const byRepo = await sql`
  select repository_id,
         sum(cost_usd) as cost,
         sum(comments_judged)::int as comments,
         max(lines_scanned)::int as lines,
         count(*)::int as steps,
         max(created_at) as last_run
  from model_usage
  where created_at > ${since} and operation = 'deep-scan' and repository_id is not null
  group by repository_id order by sum(cost_usd) desc nulls last limit 25`

console.log("\nDEEP SCAN, PER REPOSITORY")
if (byRepo.length === 0) console.log("  (no deep scans recorded yet)")
for (const r of byRepo) {
  const perKLine = r.lines ? `$${((r.cost / r.lines) * 1000).toFixed(5)}/kloc` : "—"
  console.log(
    `  repo ${String(r.repository_id).padEnd(12)} ${money(r.cost)}  ` +
      `${num(r.comments).padStart(8)} comments  ${num(r.lines).padStart(10)} lines  ${perKLine}`,
  )
}

const [totals] = await sql`
  select sum(cost_usd) as cost,
         count(distinct repository_id)::int as repos,
         count(distinct installation_id)::int as installs
  from model_usage where created_at > ${since}`

console.log(
  `\nTOTAL ${money(totals.cost)} across ${totals.repos} repositor(ies), ` +
    `${totals.installs} installation(s)`,
)

// Rows whose model has no entry in the price table are recorded but unpriced;
// a silent null here would understate the total.
const [unpriced] = await sql`
  select count(*)::int as rows, coalesce(string_agg(distinct model, ', '), '') as models
  from model_usage where created_at > ${since} and cost_usd is null`
if (unpriced.rows > 0) {
  console.log(`\n${unpriced.rows} row(s) unpriced — add rates to lib/usage.ts: ${unpriced.models}`)
}

console.log()
await sql.end()
