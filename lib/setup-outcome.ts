/**
 * What GitHub is telling us happened, decoded from the Setup URL's parameters.
 *
 * GitHub sends the user back here after the consent screen with `setup_action`
 * and usually `installation_id`. The three outcomes need different pages, and
 * one of them is not a success: a member of an organisation who cannot install
 * apps themselves gets `request`, which means an owner has been asked and has
 * not yet answered. Telling that person "you're all set" would be wrong, and
 * they would sit waiting for a scan that cannot start.
 */
export type SetupOutcome =
  /** A new installation completed. */
  | { kind: "installed"; installationId: number }
  /** An existing installation's repository selection changed. */
  | { kind: "updated"; installationId: number }
  /** Approval requested from an organisation owner; nothing is installed yet. */
  | { kind: "requested" }
  /** Reached without GitHub's parameters — a bookmark, a refresh, a crawler. */
  | { kind: "unknown" }

/** Next hands repeated parameters through as arrays; take the first either way. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function setupOutcome(params: Record<string, string | string[] | undefined>): SetupOutcome {
  const action = one(params.setup_action)
  if (action === "request") return { kind: "requested" }

  // Parsed rather than trusted: this arrives in a URL anyone can edit, and it
  // is only ever used to display a count and to decide what to say next.
  const raw = one(params.installation_id)
  const installationId = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : NaN

  // An id without a recognised action still means an install happened — GitHub
  // has changed these strings before, and the id is the load-bearing part.
  if (!Number.isSafeInteger(installationId) || installationId <= 0) return { kind: "unknown" }
  if (action === "update") return { kind: "updated", installationId }

  return { kind: "installed", installationId }
}
