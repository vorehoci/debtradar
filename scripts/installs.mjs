// Who has installed the app, newest first — the one number a campaign is
// actually buying. Read-only.
//
// `YOU` marks the account the app was developed on, passed as OWNER_LOGIN or
// given below, so a list of one is not mistaken for a list of one *customer*.
import postgres from "postgres"

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) throw new Error("Missing DIRECT_URL or DATABASE_URL")
const sql = postgres(url, { prepare: false })

const mine = (process.env.OWNER_LOGIN ?? "vorehoci").toLowerCase()
const days = Number(process.argv[2] ?? 30)

const rows = await sql`
  select i.id, i.account_login, i.installed_at,
         count(distinct r.id)::int as repos,
         coalesce(sum(r.todos), 0)::int as todos,
         max(r.last_scan_at) as last_scan
  from installations i
  left join (
    select r.*, (select count(*) from todos t where t.repository_id = r.id) as todos
    from repositories r
  ) r on r.installation_id = i.id
  where i.installed_at > now() - make_interval(days => ${days})
  group by i.id, i.account_login, i.installed_at
  order by i.installed_at desc`

const others = rows.filter((r) => r.account_login.toLowerCase() !== mine)

console.log(`\ninstallations in the last ${days} day(s)\n`)

if (rows.length === 0) {
  console.log("  none at all")
} else {
  for (const r of rows) {
    const own = r.account_login.toLowerCase() === mine
    const hours = (Date.now() - new Date(r.installed_at)) / 3600e3
    const age = hours < 48 ? `${hours.toFixed(1)}h ago` : `${(hours / 24).toFixed(1)}d ago`

    console.log(
      `  ${own ? "YOU " : "  → "}${r.account_login.padEnd(22)} ${age.padStart(9)}  ` +
        `${String(r.repos).padStart(3)} repo(s)  ${String(r.todos).padStart(6)} todos`,
    )
  }
}

console.log(
  `\n${others.length} installation(s) that are not you` +
    (others.length === 0 ? " — nobody has installed it yet" : ""),
)

await sql.end()
