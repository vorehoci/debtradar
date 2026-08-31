/**
 * The one repository the public demo may show.
 *
 * A constant rather than a URL parameter, and that is the whole point. `/demo`
 * skips the session check that every other board route performs, so whatever
 * chooses the repository *is* the authorisation. A parameter would turn this
 * page into a way to read any board in the database by guessing ids.
 *
 * n8n: a large, well-known, public codebase, and the only repository here that
 * has been through both passes — 565 marked TODOs from the regular scan and 227
 * more that only the Claude scan found. A demo of a ranking product needs
 * enough rows that the ranking is doing visible work.
 *
 * It is a fork, scanned from `vorehoci/n8n`. The page credits the upstream
 * project, because putting somebody else's comments on a commercial page
 * without saying whose they are would be poor manners at best.
 */
export const DEMO_REPOSITORY_ID = 1350353017

/** Where the code actually comes from, for attribution and for outbound links. */
export const DEMO_UPSTREAM = {
  label: "n8n-io/n8n",
  url: "https://github.com/n8n-io/n8n",
} as const
