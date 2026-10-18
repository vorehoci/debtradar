---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/demo/page.tsx","app/_landing"]
---

## Scope

The public landing page at `/`, visitor mode **Persuade**. Audience: a solo maintainer
or indie developer who owns one or two application repos, decides in seconds, and is
alone when they decide. Action: install the GitHub App, or open the real n8n scan.
Proof on hand: a genuine 227-finding scan of n8n across 4.27M lines. No testimonials,
no customers, no pricing — none exist and none may be implied.

Related surfaces inherit this world: `/demo`, `/installed`, `/dashboard`, and the
board at `/repos/[id]/board`. The board is Operate and is built code-led regardless.

## Direction contract

**THESIS**
The field is the scan, not a backdrop. Every particle is one of the 227 findings and
the filaments are where risk concentrates, so the first thing a visitor sees is their
own codebase rendered as weather. This refuses the category default — a dark hero with
a terminal screenshot beside a "ship faster" headline — and it refuses its opposite,
the neutral claim-and-screenshot page. The page earns attention with the mechanism
running, not with a picture of a product.

**OWN-WORLD**
Void `#0B0D1A`, ink `#13162B`, night `#1A1D3A` grounds. Lilac `#6A6CF6` and mist
`#BFD2FF` carry structure; ember `#FF6A3D` is the single incandescent accent and is
spent only on the active state and the primary action. The four severity bands ride
the field's own ramp rather than an invented scale: low `#6E7BA6`, moderate `#6A6CF6`,
high `#B44BE8`, critical `#FF6A3D`. Materials are grain (fine film), sheen
(interference), and mesh (displacement). Display is a variable grotesk driven on its
width axis; labels are small caps tracked wide; body is tracked lightly. Chrome is
hairline-bordered rectangles with an arrow affordance, never a filled pill.
Recognisable with all content removed by: cold particle field, one ember mark, tiny
tracked labels pinned at the margins, oversized condensed display.

**STORY**
The visitor understands within one viewport that debtradar has already read a real
codebase and ranked what it found. They believe it because the number on screen is a
real scan they can open, not a claim. They act by scanning their own repository, or by
opening the n8n scan first if they want proof before access.

**FIRST VIEWPORT**
Full-bleed particle field, hottest toward the lower right. Left margin carries a
numbered index: 01 SCAN, 02 RANK, 03 TRIAGE, 04 DEMO. The display line sits left of
centre at architectural scale, set condensed, two or three lines. Beneath it one
tracked body line, then two controls side by side: the primary, SCAN MY REPOSITORY,
hairline-bordered and lit lilac with an ember border on hover; the secondary, SEE THE
n8n SCAN, outlined and ember on hover. Bottom left carries a live readout in the
loader's position: findings resolved against lines read. Right margin carries a scroll
indicator and a one-line environment readout naming the field as the live scan. The
section below begins as a real section — the ranked findings as cards numbered 01–04,
each a genuine n8n finding.

**FORM**
`webgl-shader-portal`, a dealt challenger the user adopted from the declined row after
seeing its verdict and both risk lines. It was not on my grounded list; my own ordered
list ran git DAG, chip floorplan, game threat HUD, transit schematic, flamegraph,
weather nowcast, flight-ops board, and the roll had assigned candidate 3. The user's
pick beats the roll. Two objections stood against it and both are engineered rather
than argued: the Persuade rule that a committed form must not hide the offer, which
the contract answers by pinning an unmistakable primary action inside the first
viewport; and the fullscreen WebGL runtime, which contradicts this project's measured
mobile bundle cut from 2.6MB to 0.45MB. The shader therefore ships **desktop-only and
motion-gated**, reusing the existing `useWantsScene()` decision in
`app/_landing/scene.tsx` so the decision precedes the import and no shader bytes reach
a phone or a reduced-motion visitor; those visitors get a static rendition of the same
field at the same composition. seed:b28d69298d210252

**FINISH**
unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Monetization is undecided in PRODUCT.md; no pricing, plan, or trial may appear.
- There is no privacy policy yet. The footer must not link to one until it exists.
- Whether the static mobile field is an authored raster or CSS-only is a build
  decision, not a strategy one, but it must cost zero shader bytes either way.
