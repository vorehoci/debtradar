---
name: debtradar
description: A cold particle field with one incandescent mark — the scan rendered as weather.
colors:
  void: "#0b0d1a"
  ink-deep: "#13162b"
  night: "#1a1d3a"
  lilac: "#6a6cf6"
  mist: "#bfd2ff"
  ember: "#ff6a3d"
  band-low: "#6e7ba6"
  band-moderate: "#6a6cf6"
  band-high: "#b44be8"
  band-critical: "#ff6a3d"
  ink: "#dce6ff"
  subtle: "#9fb0dd"
  muted: "#7d8cb8"
  faint: "#727da3"
  surface: "#0b0d1a"
  panel: "#13162b"
  raised: "#1a1d3a"
  edge: "#232745"
  edge-strong: "#2e3357"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(42px, 7.4vw, 96px)"
    fontWeight: 600
    lineHeight: 0.94
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 64"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 46px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 80"
  figure:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(34px, 4vw, 52px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 76"
    fontFeature: "tabular-nums"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(14.5px, 1.2vw, 17px)"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "0.01em"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.18em"
  micro:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.22em"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  hairline: "3px"
  tight: "2px"
  circle: "999px"
spacing:
  hairline: "1px"
  tight: "10px"
  row: "14px"
  block: "24px"
  group: "40px"
  gutter: "clamp(20px, 4vw, 56px)"
  section: "clamp(48px, 7vw, 96px)"
components:
  control-primary:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tight}"
    padding: "16px 28px"
    typography: "{typography.label}"
  control-primary-hover:
    textColor: "{colors.ember}"
  control-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.tight}"
    padding: "16px 28px"
    typography: "{typography.label}"
  control-secondary-hover:
    textColor: "{colors.ember}"
  control-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.subtle}"
    rounded: "{rounded.tight}"
    padding: "12px 20px"
    typography: "{typography.label}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.subtle}"
    padding: "8px 16px"
    typography: "{typography.label}"
  finding-cell:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tight}"
    padding: "24px"
  spec-row:
    backgroundColor: "transparent"
    textColor: "{colors.subtle}"
    padding: "28px 0"
  input-search:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hairline}"
    padding: "6px 12px"
  band-mark:
    backgroundColor: "{colors.band-critical}"
    size: "10px"
---

# Design System: debtradar

## Overview

**Creative North Star: "The Scan As Weather"**

debtradar renders a codebase the way a nowcast renders an atmosphere. The hero is
not a backdrop behind a claim — it is a particle field whose filaments are where
risk concentrates, cold at the left where the copy sits and running hot toward
the lower right. Everything above the field is instrumentation read off that
weather: a numbered stage index pinned to the left margin, tiny tracked labels at
the edges, a live readout in the position a loader would occupy, a scroll rail at
the right. The page is dark, cold, and mostly empty, and the one warm thing on it
is the thing you are meant to press.

The density is instrument-panel rather than marketing-page. Structure is carried
by hairlines and by background seams — a one-pixel grid gap showing the edge
colour through a grid of panels — not by cards floating on shadow. Type does the
heavy lifting through a width axis rather than through more families: one variable
grotesk set genuinely narrow at architectural scale for display, and genuinely
wide and tiny for labels. Monospace is reserved for things that are literally
code: file paths, line numbers, scan output.

Confirmed rejections: the category default of a dark hero with a terminal
screenshot beside a "ship faster" headline, and its opposite, the neutral
claim-and-screenshot page. The filled pill button is rejected. The equal-card
feature grid is rejected — it shipped once and was replaced by a specification
list. The previous near-black-plus-mint identity is removed outright: there is no
mint and no green in this world.

**Key Characteristics:**
- Three cold grounds (void, ink-deep, night), two structural colours, one
  incandescent accent.
- One variable grotesk driven on its width axis; 64% for display, 76–80% for
  figures and headlines.
- Hairline rectangles with a drawn arrow for every control; no filled pills.
- A four-band severity ramp lifted from the field's own filaments.
- Every public figure queried from the database, never typed.
- The shader is desktop-and-motion-gated by a decision that precedes its import.

## Colors

A cold palette of three near-black blues carrying one warm accent, with the
severity ramp sampled from the shader that renders the scan.

### Primary
- **Ember** (`{colors.ember}`): The single incandescent accent. It marks the
  active state and the primary action, and nothing else: control hover and focus
  borders, the caret, the focus ring, the one highlighted word in the display
  line, the critical band, the expired-session notice. Its scarcity is what keeps
  it reading as heat rather than as a second brand colour.

### Secondary
- **Lilac** (`{colors.lilac}`): The structural colour and the brand accent
  (`--brand-accent` resolves to it). It carries the primary control's border and
  its 18% fill, the inline capability icons, the step markers, the selection
  highlight at 42%, the scroll rail's live tick, and the field's mid-temperature
  filaments. Measured 4.6:1 on the void.
- **Mist** (`{colors.mist}`): The coldest structural light. Present mainly in the
  field's high, cool pools and its upper-register filaments; used sparingly as a
  surface colour.

### Tertiary
- **Band Low** (`{colors.band-low}`): Cold steel. The quietest severity.
- **Band Moderate** (`{colors.band-moderate}`): Lilac. Mid-cold severity.
- **Band High** (`{colors.band-high}`): Violet, the field's turn toward heat.
- **Band Critical** (`{colors.band-critical}`): Ember. The hottest severity.

### Neutral
- **Void** (`{colors.void}`): The page ground and the coldest surface. Also the
  mesh colour punched over the still field.
- **Ink Deep** (`{colors.ink-deep}`): The panel ground — finding cells, cards,
  inputs.
- **Night** (`{colors.night}`): The raised ground, one step above panel.
- **Edge** (`{colors.edge}`): The hairline. Section tops, row rules, and the
  background behind one-pixel grid gaps.
- **Edge Strong** (`{colors.edge-strong}`): The visible stroke — quiet control
  borders, input borders, and the scrollbar thumb.
- **Ink** (`{colors.ink}`): Primary text and every figure that matters.
- **Subtle** (`{colors.subtle}`): Body copy and secondary labels.
- **Muted** (`{colors.muted}`): Tertiary labels, code paths, small caption type.
- **Faint** (`{colors.faint}`): The dimmest role — index numerals, rail strokes,
  placeholder text. Lifted from an earlier value that measured 3.21:1 on the void
  while carrying 11–13px text; the shipped value clears 4.5:1 and still sits a
  clear step below muted.

### Named Rules

**The One Heat Rule.** Ember appears at most twice in a viewport, and only as the
active state or the primary action. A third simultaneous spend is a regression; it
was raised as one and corrected by returning the secondary control to a lilac rest
state.

**The Four-Band Rule.** The severity ramp is the field's own ramp — steel, lilac,
violet, ember — so a band's colour and its position in the field mean the same
thing. There are four bands because a fifth would have to come from outside that
ramp.

**The Written Band Rule.** Band colour never carries meaning alone. The band name
is always set in words beside its mark, because on this ramp violet-versus-ember
is the difference between high and critical.

**The Cold Ground Rule.** Every ground is one of void, ink-deep, or night. Warmth
on this page is information, never atmosphere.

## Typography

**Display Font:** Archivo Variable, width axis loaded (`system-ui, sans-serif`)
**Body Font:** Archivo Variable (same family, default width)
**Label/Mono Font:** JetBrains Mono (`ui-monospace, monospace`)

**Character:** One grotesk doing two opposite jobs through its width axis.
Compressed to 64% the display reads as architecture — four words hold a line that
would otherwise take six. Opened out, tracked wide, and dropped to 11–12px, the
same face becomes instrument labelling. The monospace is a different material
entirely and is used only where the content is literally code.

### Hierarchy
- **Display** (600, `clamp(42px, 7.4vw, 96px)`, 0.94, `wdth` 64): The hero line
  only. Set left of centre, two or three lines, tracked tight at -0.035em.
- **Headline** (600, `clamp(28px, 3.4vw, 46px)`, 1.04–1.08, `wdth` 78–80):
  Section openers.
- **Figure** (600, `clamp(34px, 4vw, 52px)`, 1, `wdth` 76, tabular): Standalone
  numerals in the stat band.
- **Title** (600, 17–19px, -0.01em): Row and card headings.
- **Body** (400, `clamp(14.5px, 1.2vw, 17px)`, 1.62, +0.01em): Paragraphs, capped
  at 62ch in the hero and 68ch in specification rows.
- **Label** (400, 12–13.5px, 0.16–0.20em, uppercase): Controls, nav, band names,
  stage names, captions.
- **Micro** (400, 10.5–11px, 0.22–0.24em, uppercase): Margin instrumentation —
  the readout's caption, the environment readout, the scroll rail.
- **Code** (400, 12–12.5px, JetBrains Mono): File paths, line numbers, scan
  output, the footer's copyright line.

### Named Rules

**The Width-Axis Rule.** Condensed and extended come from the one loaded family's
`wdth` axis, never from a second font file. The axis must be requested at load
(`axes: ["wdth"]`); without it every `font-stretch` in the page silently does
nothing.

**The Tabular Figures Rule.** Any number read against another number down a
column — counts, risk scores, line numbers, index numerals — carries
`font-variant-numeric: tabular-nums` via the `.tabular` class.

**The Queried Figure Rule.** Figures on public surfaces come from the database.
The ranked findings, the stat band, the readout and the demo control's label are
all queried; `linesRead()` exists specifically so a lines-scanned figure cannot go
stale. A rhetorical number above a measured one reads as a page that does not know
its own figures.

## Layout

Three authored frames rather than one fluid reflow: mobile 390 (base styles),
tablet 834 (`md:`, from 768px), desktop 1280 (`lg:`, from 1024px). `lg:` rather
than `xl:` on purpose, so 1024–1279px laptops get the desktop composition rather
than the tablet one. Sections are written mobile-first with at most two overrides.

The page gutter is a single clamp, `clamp(20px, 4vw, 56px)`, used on every section
and on the hero's own overlay rows, so the left margin is one continuous edge from
the brand lockup down to the footer. Content columns cap at 1120px and centre;
hero copy caps at 760px. Vertical section rhythm is `clamp(48px, 7vw, 96px)` on
the dense sections and a flat 60px/90px pair on the narrative ones.

The hero is exactly one viewport (`h-screen`, floor 640px) and clips its own
field. Its overlay is a column — header, centred copy row, bottom instrumentation
row — and is pointer-transparent, with links and buttons opting back in, so the
overlay never swallows a gesture meant for the field. Below `lg:` the left stage
index and the right scroll rail are hidden outright rather than wrapped; four extra
lines between a phone visitor and the headline costs more than the device earns.

Grids are seamed, not gapped: a `gap-px` grid over an `edge`-coloured background
lets the hairline show through between cells. The ranked findings run 1 / 2 / 4
columns; the stat band 1 / 3. The capability list is a two-column specification
grid above `lg:` (`minmax(0,22rem) 1fr`) and a single stacked column below.

### Named Rules

**The Deterministic Scrim Rule.** Copy over the field always has its own ground. A
fixed multi-stop gradient darkens the copy column, the right rail, and the top and
bottom strips, so the field can stay vivid where there is nothing to read instead
of being dimmed everywhere to protect text in one corner. "Mostly dark over there"
is not a contrast guarantee when the field moves.

**The Margin Instrumentation Rule.** The edges carry readouts, not decoration: a
numbered stage index left, a scroll rail and environment readout right, a live
figure bottom-left in the loader's position.

## Elevation & Depth

Depth is tonal first. The stack runs void → ink-deep → night → edge → edge-strong,
and almost every "raised" surface in the build is raised only by being a lighter
ground inside a hairline. Shadows are rare and exist in exactly two roles: a lift
under the primary control, and a deep ambient drop under the single largest
desktop-only panel.

### Shadow Vocabulary
- **Control lift** (`box-shadow: 0 14px 34px -16px rgba(106,108,246,.95)`): Under
  the primary control only. A tinted drop, offset downward and spread negative, so
  it reads as the control sitting above the field rather than glowing.
- **Panel drop** (`box-shadow: 0 30px 80px 0 rgba(0,0,0,.6)`): The scan-output and
  list panels at `lg:` only. Black, far, and soft; it separates a wide panel from
  the ground without tinting it.

### Named Rules

**The Offset Shadow Rule.** A shadow that carries depth carries an offset and a
blur. Zero-offset coloured halos are not a depth device in this system and must
not be used to lift a surface, a control, or a panel. The only zero-offset glows
in the build belong to emissive marks, where the glow is the light source itself
and not the elevation (see Do's and Don'ts).

**The Tonal First Rule.** Reach for the next ground and a hairline before reaching
for a shadow. Three of the four shipped shadows are desktop-only or
single-instance; the whole application shell has none.

## Shapes

Rectangles with a near-zero radius. `3px` is the world's corner — inputs, panels,
step markers, the one rounded overlay — with `2px` on tight controls and the focus
ring. Nothing in the system uses a soft or generous radius. `rounded-full` is
reserved for genuinely circular marks: the brand radar dial, the scroll rail's
ticks, the scrollbar thumb.

Borders are hairlines at 1px, in `edge` for structural rules and `edge-strong` for
visible strokes. Separation is as often a seam — a 1px grid gap over an
`edge`-coloured ground — as it is a border.

The recurring non-rectangular silhouette is the severity mark: a 10px square
rotated 45°, drawn as an element and coloured from the band tokens. Inferred
findings get the same mark at 60% opacity with a `faint` outline offset 2px.

Icons are drawn, never typed. The set (Arrow, Chevron, Check, BandMark, and the
six capability glyphs) is one stroke weight — 1.75 at 24px with square caps for
the UI set, 1.7 with round caps for the capability set — and no unicode glyph
stands in for an icon anywhere in `app/`.

### Named Rules

**The Hairline Rectangle Rule.** Chrome is a hairline-bordered rectangle at 3px or
less. The filled pill is the category's button and this world does not wear it.

**The Drawn Icon Rule.** Every icon is an SVG path at the set's stroke weight. `→`,
`›`, `✓` and `■` are text, and they render at whatever weight and baseline the
resolved font chose — which is how the page once shipped two different arrows one
line apart.

## Components

### Buttons
- **Shape:** Hairline rectangle, effectively square-cornered (2px), with a drawn
  arrow trailing the label. Label type: uppercase, 13.5px, 0.16em tracking.
- **Primary:** Lilac border over an 18% lilac fill, `ink` label, control-lift
  shadow, 16px/28px padding.
- **Secondary:** 60%-opacity lilac border, no fill, `ink` label at full strength.
  It is a clear step below the primary but never the faintest thing in the
  viewport — the conversion goal must not be the dimmest element on screen.
- **Quiet / Nav:** `edge-strong` border, `subtle` label, 12px/20px padding.
- **Hover:** Border and label both go ember; the arrow nudges 4px right
  (`group-hover:translate-x-1`), 200ms. Colour transitions are 200ms.
- **Focus:** The global `:focus-visible` ring — 2px ember, 2px offset, 2px radius.
  `:focus-visible` rather than `:focus`, so a mouse press leaves no ring behind.

### Cards / Containers
- **Corner Style:** 2–3px, often none at all when the cell sits in a seamed grid.
- **Background:** `ink-deep` cells on an `edge`-coloured grid ground; `void` cells
  in the stat band.
- **Shadow Strategy:** None. Separation comes from the seam (see Elevation).
- **Border:** Internal rules in `edge`; the section itself opens on a
  `border-t border-edge`.
- **Internal Padding:** 24px, with an inner `border-t border-edge` and 16px above
  the metadata foot.

### Inputs / Fields
- **Style:** `panel` ground inside an `edge-strong` hairline at 3px, 6px/12px
  padding, 12px `ink` text, `faint` placeholder.
- **Focus:** Border shifts to 50%-opacity lilac; the native outline is removed in
  favour of that shift plus the global ember ring on keyboard focus.

### Navigation
- Uppercase 12.5px labels at 0.16em tracking in `subtle`, 28px apart, hovering to
  ember. The session-dependent action is a quiet bordered control. Below `md:` the
  secondary link drops out rather than collapsing into a menu. No dead links: a
  route that does not exist is not in the nav.

### The Scan Field
The signature component, and the thesis. A full-bleed WebGL field whose filaments
run the severity ramp — void ground, lilac at the ridges, violet with heat, ember
at the peak — composed cold at the copy and hot toward the lower right.

- **Gating:** The decision precedes the dynamic import. `(min-width: 768px)` and
  not `(prefers-reduced-motion: reduce)`, both starting `false` so the server
  render and first paint agree. Hiding a loaded shader with a CSS class is not
  declining it.
- **Still rendition:** Four stacked radial gradients in the band colours plus a 4px
  radial-gradient mesh punching void through them, drifting 38s on `transform`
  only. CSS, not a raster: a screenshot would be another request and hundreds of
  kilobytes on exactly the connections this fallback protects.
- **Failure:** An error boundary and an explicit `onFail` both fall back to the
  still field. A refused GL context must not blank the page whose only job is a
  first impression.

### The Readout
One resolved sentence in the hero's bottom-left, in the position a loader would
hold: a micro caption naming the repository, then queried figures set in `ink` and
tabular inside `subtle` prose. Explicitly not four figure-and-label pairs — a count
of findings says nothing until you know how much code was read to find it.

### The Severity Mark
A 10px square rotated 45°, filled from `band-*`, always with the band name written
beside it in a 12px tracked uppercase label. Model-inferred findings carry the mark
at 60% opacity with an offset `faint` outline, their text set italic in `subtle`,
and their provenance written as "Undeclared" — the render saying what the ranking
already encodes.

### The Specification List
The replacement for a six-card feature grid. Rows separated by hairline rules, a
`minmax(0,22rem) 1fr` two-column grid above `lg:`, icons inline at text weight in
lilac rather than in tiles. Same facts, no scaffold.

## Do's and Don'ts

### Do:
- **Do** spend ember only on the active state and the primary action, at most
  twice in a viewport.
- **Do** write the band name beside every band mark; colour never carries meaning
  alone.
- **Do** build chrome as hairline rectangles at 3px or less with a drawn arrow.
- **Do** get condensed and extended from Archivo's `wdth` axis (64% display,
  76–80% figures and headlines), not from a second family.
- **Do** reserve JetBrains Mono for code, paths, line numbers, and scan output.
- **Do** mark comparable figures with `.tabular`.
- **Do** query every figure on a public surface from the database.
- **Do** draw icons as SVG at the set's stroke weight.
- **Do** separate cells with a 1px seam over `edge` before reaching for a border or
  a shadow.
- **Do** put the gating decision before a heavy dynamic import, and give the
  declined path a composition-matching still rendition that costs zero bytes of
  the thing it declined.
- **Do** give copy over the field its own deterministic scrim.
- **Do** let a data failure cost a section its figures, never the page its
  composition.

### Don't:
- **Don't** use a filled pill as a control.
- **Don't** introduce a fifth severity band; the ramp has four colours and no
  fifth one comes from the field.
- **Don't** lift a surface or control with a zero-offset coloured halo; depth
  shadows carry offset and blur.
- **Don't** use `rounded-full` on anything that is not a genuinely circular mark.
- **Don't** let a unicode glyph stand in for an icon.
- **Don't** reintroduce mint, green, or any warm hue other than ember; the grounds
  are cold by rule.
- **Don't** build a feature section as a grid of equal icon-heading-body cards.
- **Don't** ship a row of hero metrics in place of one resolved sentence.
- **Don't** type a figure that the database can answer.
- **Don't** make the conversion action the faintest element in a viewport.
- **Don't** hide a loaded shader with a CSS class and call it gating.
- **Don't** put a text colour under 4.5:1 on the void behind 11–13px type; `faint`
  is the floor and it is a role, not a licence.
