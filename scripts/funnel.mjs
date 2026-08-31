// Where paid traffic stops. Read-only.
//
// Page views come from Vercel Web Analytics; the clicks between them come from
// here, because custom events are a paid feature there and this project is not
// on that plan. Compare the counts below against `/` and `/dashboard` views in
// the Vercel dashboard to see the whole path.
import postgres from "postgres"

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) throw new Error("Missing DIRECT_URL or DATABASE_URL")
const sql = postgres(url, { prepare: false })

const days = Number(process.argv[2] ?? 30)
const since = sql`now() - make_interval(days => ${days})`

const rows = await sql`
  select name, placement, count(*)::int as clicks, max(created_at) as latest
  from funnel_events where created_at > ${since}
  group by name, placement order by count(*) desc`

const [{ installs }] = await sql`
  select count(*)::int as installs from installations where installed_at > ${since}`

console.log(`\nlast ${days} day(s)\n`)

if (rows.length === 0) {
  console.log("  no clicks recorded yet")
} else {
  for (const r of rows) {
    const hours = (Date.now() - new Date(r.latest)) / 3600e3
    const age = hours < 48 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`
    console.log(
      `  ${r.name.padEnd(14)} ${r.placement.padEnd(18)} ${String(r.clicks).padStart(5)} clicks` +
        `   last ${age} ago`,
    )
  }
}

const cta = rows.filter((r) => r.name === "cta").reduce((n, r) => n + r.clicks, 0)
const installClicks = rows.filter((r) => r.name === "install-click").reduce((n, r) => n + r.clicks, 0)

console.log(`
  landing views      → see Vercel Analytics: "/"
  pressed a CTA      ${String(cta).padStart(5)}
  dashboard views    → see Vercel Analytics: "/dashboard"
  pressed install    ${String(installClicks).padStart(5)}
  installed          ${String(installs).padStart(5)}

  The widest gap is the problem. A large drop from landing views to CTA presses
  is the page; a large drop from CTA presses to dashboard views is GitHub's
  sign-in screen.`)

await sql.end()
