# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a **solo maintainer or indie developer** who owns one or two
application codebases. They feel the TODO pile personally rather than as a
reporting line, they install on impulse, and they decide in seconds — there is no
budget conversation and no procurement step between seeing the product and using
it.

They arrive already knowing their repo has a pile of unresolved markers. What
they do not know is which of them matter.

**The audience is application codebases, not libraries.** Measured 2026-08-23 by
shallow-cloning and counting `TODO|FIXME|HACK|XXX`: express 0, axios 6, vite 34,
date-fns 45, astro 121, Ghost 443. Small libraries have essentially none, because
review culture rejects them; applications accumulate hundreds. Any demonstration
must use an application repo — a library repo looks empty and proves nothing.

## Product Purpose

debtradar is a GitHub App that turns the TODO comments already in a codebase into
a **triaged, scored backlog** instead of a flat list.

Success is a maintainer who opens the board and acts on the top item — not one
who merely sees a complete inventory. A page that says "here are your 400 TODOs"
has failed even when the count is correct.

## Positioning

**The ranking is the product; detection is not.** Detection is solved — GitHub
Actions that mirror TODOs into issues exist and are free. They fail because they
move every TODO into an issue tracker, where it drowns alongside the rest. The
defensible mechanism is the risk score: a TODO's rank comes from what the marker
admits to, how old it is, how churny its file is, and whether its author is still
active in the repo.

A neighboring product could copy the regex in an afternoon. It could not copy a
score calibrated against real repository history.

## Operating Context

The user installs a GitHub App against a repository they own, from either
github.com or the product's own landing page. A scan runs over the default
branch; a separate, explicitly triggered deep scan sends batches to Claude to
find debt that carries no marker at all.

They then work in a board (drag between bands) or a list (narrow screens,
scanning). The board is the surface they return to; the landing page is seen
once.

Markers recognised: `TODO`, `FIXME`, `HACK`, `XXX`, `BUG`, `OPTIMIZE`,
`REFACTOR` (`lib/todos.ts`). Severity bands: `critical`, `high`, `moderate`,
`low`. A user's own band choice always overrides the computed one.

## Capabilities and Constraints

- **Built and working:** GitHub App install and webhooks, repository scan,
  risk ranking with four bands, board with drag-to-reband, list view, search,
  dismissal, Claude deep scan with per-finding confidence and category, a public
  read-only demo, post-install hand-off, cost ledger, first-party funnel events.
- **Requested GitHub permissions are deliberately minimal:** `checks:write`,
  `contents:read`, `metadata:read`. No write access to code.
- **Claude findings are discounted on purpose.** A marker the author wrote is
  evidence; a model's inference is a suggestion. LLM findings are multiplied by
  `confidence * 0.7`, which keeps them out of the top bands unless they are both
  confident and serious (`db/ranking.ts`).
- **Cost is real and measured.** A deep scan of n8n (17,220 comments, 4.27M
  lines) costs **$1.1682**; 94% of spend is input tokens. `DEEP_SCANS_PER_DAY`
  is 12, which is roughly $14/day of exposure per installation.
- **Known gap:** a rate-limited or capped API key is currently
  indistinguishable from a clean repository, because batch classification
  failures are swallowed. Surfacing this is outstanding.
- **Known gap:** there is no privacy policy. This blocks Google Ads review and
  is overdue independently.
- **Undecided:** monetization. There is no price, no plan, and no billing code.
  Future work must not state or imply one.
- **Deliberately out of scope:** multi-VCS, teams and orgs, billing, anything
  enterprise.

## Brand Commitments

- The name **debtradar**, at `debtradar.io`.
- The **radar metaphor** is load-bearing in the name itself: the product's claim
  is that it detects and ranks what you cannot see from inside the codebase.
  The metaphor is committed; no particular rendering of it is.

Nothing else about the current visual treatment is a commitment. The existing
near-black-plus-mint identity is undocumented, was never specified, and is
explicitly available for replacement.

## Evidence on Hand

- **A real scan of n8n**, served publicly at `/demo` as a read-only board with
  genuine findings, bands, and Claude-found items. This is the strongest asset
  the product has: it is not a mockup.
- **Real cost data** in `model_usage`, and a real funnel in `funnel_events`
  (`npm run db:costs`, `db:funnel`, `db:installs`).
- **Measured marker counts** across six public repositories (see Users).
- **No testimonials, no customers, no benchmarks, no press, no case studies.**
  None exist. Future work must not fabricate any of these, and must not imply
  adoption the product has not had.
- Installation volume to date is very low. Any claim of traction would be false.

## Product Principles

1. **Rank, don't enumerate.** Every feature must serve triage. More detection
   surface is not more product.
2. **The author's words outrank the model's.** A written marker is evidence; an
   inferred finding is a suggestion, and the ranking says so.
3. **Earn the install in seconds.** The user decides fast and alone; anything
   that defers understanding costs the install.
4. **Show the real scan.** The product's proof is a genuine repository with
   genuine findings, never an illustration of one.
5. **Ask for as little as possible.** Minimal GitHub scopes are part of the
   pitch, not an implementation detail.

## Accessibility & Inclusion

No product-specific standard has been established. The existing implementation
already respects `prefers-reduced-motion` and treats it as load-bearing rather
than decorative; replacement work must preserve that.
