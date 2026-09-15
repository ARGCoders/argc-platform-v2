---
name: ARGC Platform
description: A systems-terminal design language for a production-oriented engineering collective
colors:
  signal-maroon: 'oklch(0.34 0.14 21)'
  signal-maroon-dark: 'oklch(0.26 0.12 21)'
  signal-maroon-light: 'oklch(0.44 0.14 21)'
  terminal-navy: 'oklch(0.18 0.03 240)'
  steel-blue: 'oklch(0.42 0.07 225)'
  steel-blue-dark: 'oklch(0.28 0.06 225)'
  mist: 'oklch(0.85 0.025 225)'
  alert-coral: 'oklch(0.68 0.18 15)'
  signal-green: 'oklch(0.68 0.18 145)'
  signal-amber: 'oklch(0.68 0.18 78)'
  paper: 'oklch(0.98 0.003 240)'
  stone: 'oklch(0.94 0.005 240)'
  ink: 'oklch(0.18 0.03 240)'
  ink-muted: 'oklch(0.42 0.015 240)'
  hero-ink: 'oklch(1 0 0)'
  hero-ink-muted: 'oklch(0.78 0.04 25)'
  hero-ink-dim: 'oklch(0.6 0.05 25)'
  border: 'oklch(0.84 0.006 240)'
  input-boundary: 'oklch(0.6 0.012 240)'
  destructive: 'oklch(0.5 0.2 25)'
typography:
  display:
    fontFamily: 'Space Grotesk, system-ui, sans-serif'
    fontSize: 'clamp(3rem, 7vw, 5.5rem)'
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Space Grotesk, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 'normal'
  title:
    fontFamily: 'Space Grotesk, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: 'normal'
  body:
    fontFamily: 'Space Grotesk, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 'normal'
  label:
    fontFamily: 'IBM Plex Mono, Courier New, monospace'
    fontSize: '0.72rem'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '0.08em'
rounded:
  none: '0rem'
spacing:
  xs: '0.5rem'
  sm: '0.75rem'
  md: '1rem'
  lg: '1.5rem'
  nav: '4rem'
components:
  button-primary:
    backgroundColor: '{colors.signal-maroon}'
    textColor: 'oklch(0.985 0 0)'
    rounded: '{rounded.none}'
    padding: '0.5rem 0.625rem'
  button-primary-hover:
    backgroundColor: 'color-mix(in oklch, {colors.signal-maroon} 80%, transparent)'
  button-outline:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '0.5rem 0.625rem'
  badge-default:
    backgroundColor: '{colors.signal-maroon}'
    textColor: 'oklch(0.985 0 0)'
    rounded: '{rounded.none}'
    padding: '0.125rem 0.5rem'
  card:
    backgroundColor: 'oklch(1 0 0)'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '1rem'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '0.75rem 1rem'
---

# Design System: ARGC Platform

## Overview

**Creative North Star: "The Systems Terminal"**

ARGC's platform reads as a console you'd trust to run infrastructure, not a marketing site wearing an engineering costume. Hard square corners (every radius token resolves to `0`), uppercase mono labels tracked like system output, and an ASCII animation running live in the hero all point the same direction: this is a tool that reports state, not one that decorates it. The maroon/navy surface pair does double duty — maroon is the "live" signal color (hero, primary actions, alerts), navy is the console background the member dashboard runs on.

Color is deliberate but not loud: Signal Maroon is used sparingly and always with intent (primary actions, the one accent that means "this matters"), while the rest of the palette sits in a tight neutral band so nothing competes with it — Navy and Stone stay cool, Paper has since moved warm (see Neutral, below). The pairing of a confident geometric sans (Space Grotesk) for voice and a monospace face (IBM Plex Mono) for system-state text (labels, roles, tags) reinforces the terminal read: prose speaks, mono reports.

This is an explicit departure from the generic shadcn/SaaS look (primitives are adopted but rethemed, never left stock). Paper's own color has reversed course since this system first shipped — it started cool specifically to reject V1's `#FAF8F2` warm-cream base, then deliberately moved warm again to a different value; see Neutral, below, for the current rationale.

**Key Characteristics:**

- Every corner is square — `--radius: 0` is a brand rule, not an unset default.
- Flat at rest; shadows appear only on floating overlay surfaces (menus, dialogs).
- Mono + uppercase + wide tracking marks anything the system is "reporting" (roles, labels, tags) as distinct from anything the system is "saying" (headlines, body copy).
- Maroon is rare and load-bearing; when it shows up, it means primary action or live/alert state.
- Motion favors an expo ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) — a fast, confident settle, not a bouncy or lingering one.

## Colors

A tight neutral base — Navy and Stone cool, Paper warm since its own reversal (see Neutral, below) — with one warm, load-bearing accent; nothing competes with Signal Maroon for attention.

### Primary

- **Signal Maroon** (`oklch(0.34 0.14 21)` / `#7A1D22`): the hero background, primary buttons, active/ring states, and anywhere the interface commits to an action. Two tonal steps exist — **Signal Maroon Dark** (`oklch(0.26 0.12 21)` / `#421016`) for the scrolled navbar on maroon-variant pages, and **Signal Maroon Light** (`oklch(0.44 0.14 21)` / `#9E2A32`) which reads better than the base on Terminal Navy in dark contexts.

### Secondary

- **Steel Blue** (`oklch(0.42 0.07 225)` / `#3C5F77`): secondary buttons and chart series. A cooler, quieter counterpart to maroon — used when an action exists but isn't the primary one. **Steel Blue Dark** (`oklch(0.28 0.06 225)`) is its dashboard/dark-surface step; **Mist** (`oklch(0.85 0.025 225)` / `#CBD4DF`) is its palest tint, used for dashboard sidebar foreground text and `StatusChip`'s dark-surface `scheduled` tone (see Status Accents, below).

### Tertiary

- **Alert Coral** (`oklch(0.68 0.18 15)` / `#E8635A`): the single sharpest accent in the system. Used deliberately rarely — chart highlight, accent state — never as a second primary.

### Status Accents

`StatusChip` now carries five tones, not the original three — `scheduled` and `pending` were promoted out of the shared ambient `neutral` to their own colors, matching a reference kit's per-status palette rather than this system's earlier "equally-loud, equally-rare, never an open palette" stance. That stance still holds for Green/Coral/Amber specifically (all three share Alert Coral's lightness and chroma, `0.68` / `0.18`, hue rotated); `scheduled` breaks from it on purpose — Steel Blue/Mist sit at a different lightness register entirely, chosen for contrast, not to match the loud family.

- **Signal Green** (`oklch(0.68 0.18 145)`): `StatusChip`'s positive/complete tone — `completed`, `approved`, `published`, `active`. Also `StatCard`'s positive-toned delta and `NodeMemberRow`'s completed-stage dot.
- **Signal Amber** (`oklch(0.68 0.18 78)`): the Architect step of `TierBadge`, and now also `StatusChip`'s `pending` tone (`pending` evaluations/posts/submissions) — one value on both surfaces, no split needed (measures 6.40:1 on Navy, 2.57:1 on Paper, in line with what Green/Coral already measure on Paper).
- **Alert Coral** does the equivalent negative-tone job everywhere Signal Green does the positive one — `StatusChip`'s negative tone, `StatCard`'s negative-toned delta, `NodeMemberRow`'s missed-stage dot.
- **Steel Blue** (light surface) / **Mist** (dark surface) together carry `StatusChip`'s `scheduled` tone (`scheduled` evaluations and events). Surface-split because Steel Blue alone measures only 2.26:1 against Terminal Navy — Mist is Steel Blue's own pale step, already documented above (Secondary) as built for dashboard-surface text, reused here for the same reason.

Sanctioned uses beyond `StatusChip`/`TierBadge` each still pair the hue with a non-color cue rather than relying on hue alone where the pair sits on the red-green confusion axis — `NodeMemberRow`'s missed dot carries a ring, `StatCard`'s delta carries bold weight, Green/Coral chips differ in border style (solid/dashed). Amber and Steel Blue/Mist don't get that same treatment: they aren't on that confusion line the way Green and Coral are. A new use of any of these colors outside an existing sanctioned context is a durable system change, recorded here, not a silent extension.

### Neutral

- **Terminal Navy** (`oklch(0.18 0.03 240)` / `#0F1720`): the dashboard background and the mobile full-screen menu. This is the "console" surface — cool, near-black, hue-240.
- **Paper** (`oklch(0.955 0.0083 91.5)` / `#F2F0EA`): the public-site page background. Warm, near-zero chroma. This reverses an earlier decision on this exact token — Paper was cool (hue-240) and its warmth was explicitly rejected as "V1's sepia-tinted look"; the current direction deliberately re-adopts a warm neutral, distinct from V1's own `#FAF8F2` value but in the same warm register. **Stone stays cool (hue-240) for now** — whether it follows Paper into the warm family is a separate, not-yet-made decision, so Paper and Stone are temporarily on different hue axes.
- **Stone** (`oklch(0.94 0.005 240)`): the alternating section background on paper, one step down from Paper.
- **Ink** (`oklch(0.18 0.03 240)`) / **Ink Muted** (`oklch(0.42 0.015 240)`): text on Paper/Stone surfaces, full and muted weight.
- **Hero Ink** (`oklch(1 0 0)`) / **Hero Ink Muted** (`oklch(0.78 0.04 25)`) / **Hero Ink Dim** (`oklch(0.6 0.05 25)`): text on Maroon/Navy surfaces, three weights of emphasis.
- **Border** (`oklch(0.84 0.006 240)`): decorative dividers and card outlines only — not for anything that must be perceivable as a control boundary.
- **Input Boundary** (`oklch(0.6 0.012 240)`): the token for any form-control edge. Deliberately darker than `border` — measured 3.46:1 on Paper (re-measured after Paper's warm reversal above; was 3.74:1 against the old cool Paper) and 3.32:1 on Stone (unchanged), both still meeting WCAG 2.1 SC 1.4.11's 3:1 non-text contrast requirement — Paper's margin is real but has narrowed, worth re-checking again if Paper's value moves further. Never substitute `border` for a control edge.

### Named Rules

**The One Signal Rule.** Signal Maroon is the only color that means "act here" or "this is live." It never shares that job with Alert Coral or Steel Blue — if two colors compete for primary-action attention on one screen, one of them is wrong.

## Typography

**Display/Body Font:** Space Grotesk (with system-ui, sans-serif fallback), weights 400/500/700 only — 600 is deliberately excluded (unused, so not loaded).
**Label/Mono Font:** IBM Plex Mono (with Courier New, monospace fallback), weights 400/500.

**Character:** Confident display type carries the voice — Space Grotesk pushes large and bold in the hero, medium weight elsewhere — while IBM Plex Mono stays a small, technical accent reserved for anything reporting system state rather than speaking to the visitor.

### Hierarchy

- **Display** (700, `clamp(3rem, 7vw, 5.5rem)`, line-height 1.04, tracking -0.025em): the hero headline only. `text-wrap: balance` keeps line breaks intentional.
- **Page Title** (700, `clamp(2rem, 5vw, 3rem)`): the H1 of a standalone page that isn't the hero — `/events` is the first consumer. Fills the gap between Display (hero-only) and Headline; a page H1 authored as a raw `text-4xl sm:text-5xl` breakpoint jump was the drift that exposed the missing step, against the system's own fluid-`clamp()`-not-breakpoints rule (see Layout, below).
- **Headline** (700, ~1.5rem, line-height 1.2): section titles.
- **Title** (500, 1rem, line-height 1.375; 0.875rem in compact/`sm` card contexts): card titles, component headers.
- **Body** (400, 0.9375rem, line-height 1.65): running copy, form values. Hero tagline caps at 54ch.
- **Label** (500, 0.6–0.72rem, tracking 0.08–0.15em, uppercase, mono): field labels, role/tag text, dropdown menu items, breadcrumb-adjacent system text.

### Named Rules

**The Mono-Reports, Sans-Speaks Rule.** If the text is the system telling you what state something is in (a role, a label, a tag, a tier), it's mono, uppercase, and tracked wide. If it's the product talking to a person (headline, body, tagline, button label), it's Space Grotesk. Never mix the two jobs onto one string.

## Layout

Fluid, `clamp()`-driven spacing rather than fixed breakpoint jumps — hero and navbar padding scale continuously with viewport width (e.g. `clamp(1.5rem, 4vw, 3rem)` horizontal nav padding) instead of snapping at `md`/`lg`. The navbar is a fixed-height rail (`--spacing-nav: 4rem`) pinned across page (View Transitions) navigations — it explicitly does not animate during route transitions, only the page content does (140ms exit, 220ms enter, both expo-family easing).

Card internal spacing runs on a `--card-spacing` custom property (1rem default, 0.75rem in the `sm` density) so header/content/footer padding stay in lockstep off one value. Mobile navigation is a full-screen navy takeover, not a slide-out drawer — body scroll is locked while it's open.

## Elevation & Depth

Flat by default. Cards, buttons, and form fields carry zero `box-shadow` — depth comes from a 1px ring (`ring-1 ring-foreground/10`) on cards and from surface-color contrast (Paper vs. Stone vs. Navy vs. Maroon), not from simulated light. A shadow only appears on content that genuinely floats above the page — dropdown menus and dialogs use `shadow-lg` alongside a `ring-1` border, because those surfaces need to visually separate from whatever is behind them.

### Shadow Vocabulary

- **Overlay** (`shadow-lg` + `ring-1 ring-foreground/10`): dropdown menu and dialog content only. Never applied to a card, button, or anything at rest in the page flow.

### Named Rules

**The Flat-at-Rest Rule.** Nothing sitting in the normal page flow gets a shadow, no matter how "important" it is — importance is expressed through the Signal Maroon rule and type hierarchy, not elevation. Shadow is reserved exclusively for content that has left the page flow to float above it.

## Shapes

Every corner in the system is square. Tailwind's radius scale (`--radius-sm` through `--radius-4xl`) is deliberately collapsed to a single `--radius: 0rem`, so components authored with `rounded-lg`, `rounded-xl`, or `rounded-4xl` classes (buttons, cards, badges, inputs) render hard-edged regardless of the class name — the class expresses semantic size/shape intent in code; the token enforces the actual brand geometry. `Avatar` is square, zero radius, like everything else — an earlier note here claimed it as a `rounded-full` exception, but the shipped avatar has never actually been rounded, so that was corrected rather than the code silently redesigned to match a stale doc. The scroll-pulse hero indicator dot and `NodeMemberRow`'s per-stage evaluation dots are circular — literal physical/organic forms (a status light, not UI chrome), the actual exception to the square-corner rule.

Borders are thin (1px) and used for two distinct jobs that must not be conflated: `border` (decorative — card edges, dividers) and the `input` boundary token (functional — anything a WCAG-measured 3:1 contrast is required for). A form control's edge is never styled with the decorative `border` token.

## Components

### Buttons

- **Shape:** hard square corners (0), no exception.
- **Primary:** Signal Maroon background, near-white text, `h-8`/`px-2.5` default sizing (compact, terminal-density rather than generous SaaS padding).
- **Hover / Focus:** primary hover drops to 80% opacity of the fill color (not a hue shift); focus shows a 3px ring at 50% opacity of the ring color plus a solid ring-color border — always visible, never a subtle outline. Active press nudges the button down 1px (`translate-y-px`) for tactile, physical feedback rather than a scale or color-only response.
- **Outline / Secondary / Ghost / Destructive:** Outline sits on `background` with a `border`-token edge, filling to `muted` on hover. Secondary uses the Steel Blue fill. Ghost is transparent until hover. Destructive is a tinted (10–20% opacity) red fill, not a solid one — reserves full-saturation red for genuinely blocking states.
- **Custom CTA buttons** (navbar Register/Dashboard/Logout — not the shadcn primitive): uppercase, mono-adjacent tracked labels (`tracking-[0.05em]` to `[0.06em]`), generous horizontal padding (`px-7`), and a bare-anchor construction rather than the shared Button component — these are treated as marketing-surface CTAs, distinct from in-app actions.

### Badges

- **Style:** compact (`h-5`), square, small-caps-weight text at `text-xs`, `px-2`. Same variant vocabulary as buttons (default/secondary/destructive/outline/ghost).
- **State:** no selected/unselected toggle state in the current implementation — badges are informational, not interactive filters, in what's built so far.

### Rank & Status Chips

Three small `h-5` mono/uppercase chips report a different kind of fact each, and are built to stay visually distinct from one another rather than sharing one generic "chip" look.

- **RoleBadge** — an assigned permission. Weight and fill escalate through the system's own accent tokens as rank rises: outline-only at Guest, a light neutral fill at Member, Steel Blue at Node Leader, Alert Coral at Super Peer, Signal Maroon — reserved for this one rank alone — at Super Admin Peer.
- **TierBadge** — an earned progress state, deliberately a different construction so it can never be mistaken for a role: a 4-segment tick bar filling left to right (gray → Steel Blue → Signal Amber → Alert Coral). Every tier, including the top one, stays outline-only — RoleBadge alone owns "solid fill means top rank," so a member who is simultaneously Super Peer and Vanguard tier never renders two identically-filled Coral chips in one row.
- **StatusChip** — a process state on a record (cycle, evaluation, event, post, submission). Always outline-only, never filled — fills are reserved for rank. Five tones: Signal Green (positive/complete), Alert Coral (negative/blocking), Signal Amber (`pending`), Steel Blue/Mist (`scheduled`, surface-split), or the ambient neutral border/text of whatever surface it renders on for every other not-yet-happened state (`proposed`, `upcoming`, `closed`) — on Terminal Navy that's `hero-ink/55`, the same measured 3:1 dark-surface boundary `Field` already uses, not the decorative `sidebar-border` hairline. Positive and negative tones also differ in border style (solid vs. dashed), not just hue, since Signal Green and Alert Coral share lightness/chroma. Takes a `surface: 'dark' | 'light'` prop like any other surface-aware control.
- All three accept an optional `ariaLabel` prop that overrides their default `Role: …` / `Tier: …` / `Status: …` accessible name, so a screen reader reading several chips in one row hears which axis each belongs to instead of a bare, ambiguous word.

### Bordered Rows

The dashboard's tabular pattern — `EvaluationStageRow` is the first built; `NodeMemberRow`, `EventRow`, and `XpLedgerTable`'s own rows are expected to match it rather than each inventing a variant. Calibrated against a reference component sheet's data-ledger row.

- **Height:** a fixed `46px` per row. Not a minimum — a hard contract, so a `LoadingRow` skeleton can match it exactly without inspecting a live row first.
- **Border:** bottom-only (`border-b`), never a full box. The outer edges (top, left, right) belong to whatever wraps a list of rows — a card, a table — not the row itself. Rows stacked inside that wrapper divide like a real ledger; a lone row rendered without a wrapper is intentionally left open on three sides rather than each row drawing its own redundant box.
- **Typography follows the Mono-Reports, Sans-Speaks rule exactly — being enum-sourced does not by itself put a field on the mono side.** What decides it is whether the text classifies (mono, same job RoleBadge/TierBadge/StatusChip do) or narrates/names (sans). A field naming which fixed category a record belongs to — a stage, a role, a tier — is mono even though it's a leading, prominent field. A person's name is always sans, matching `DashboardSidebar`'s `Identity`. A narrated description built from an enum (an XP ledger's category column, e.g. "Evaluation (on time)") reads as prose, not a tag, so it stays sans too — the enum origin doesn't decide it, the classify-vs-narrate distinction does. Timestamps and quantities stay mono, matching the existing "mono for amounts and dates" rule. `StatusChip` handles status regardless.
- **No hover state on a read-only row.** A background highlight on pointer-over promises the row responds to a click; a row with no click affordance doesn't get the highlight. Only a genuinely interactive row (one that navigates or opens something) earns a hover treatment — evaluate that per row type when it's built, not by default.
- **Surface-aware** like `StatusChip`/`Breadcrumb`/`Field`: takes `surface: 'dark' | 'light'`, defaulting `'dark'` for the dashboard's real background.
- **Every field carries its own `aria-label`**, the same disambiguation `RoleBadge`/`TierBadge`/`StatusChip` already do — a row packs several bare values (a name, a date, a number) into one line, and without a label a screen reader has no way to tell which field it's reading or to tell two different null states (no date vs. no score) apart. A field whose visible text is already fully self-describing on its own (a fixed enum label, say) can skip a redundant label; anything else gets one.
- **A field that would overflow at narrow widths degrades, it doesn't disappear.** Shortening a date's format, dropping a unit, abbreviating a number ("1.2k") — anything that keeps the information present and in the accessibility tree. `display:none`-ing a field below a breakpoint is the failure mode this rule exists to catch: it removes information from mobile and assistive-tech users alike, not just the visual layout.
- **A row that becomes a link gets its own concise `aria-label`, not the concatenation of its fields' labels.** Per-field labels exist for the static case, where a screen reader visits each field independently; wrap the row in a link without overriding its name and every field's label runs together into one sentence-long name repeated for every row in the list. Name the link the way a person would describe the row in one phrase (who, and the one or two facts that matter most), not every field it contains.
- **A `StatusTone`-colored indicator smaller than `StatusChip` still needs its own non-color cue.** `StatusChip` is outline-only specifically so it can carry a border-style difference (solid/dashed) alongside the Signal Green/Coral hue pair; a same-tone dot or icon too small for that treatment (`NodeMemberRow`'s 6px evaluation dots, say) needs an equivalent substitute — a ring, a distinct shape — rather than shipping hue alone at a size where the system's own colorblind-safety guarantee no longer holds.
- **A component with a real header row uses real `<table>`/`<th scope="col">` markup, not styled divs with per-field `aria-label`s.** `EvaluationStageRow` and `NodeMemberRow` are bare rows with no header of their own, so per-field labels are the right tool. `XpLedgerTable` is the first in this family to render an actual header — semantic table markup is the correct native mechanism for column identity once one exists, not a third hand-rolled repetition of the row-level pattern.
- **`LoadingRow`** (`components/shared/dashboard/loading-row.tsx`) is this template's skeleton — same `h-[46px]`/border-b/surface contract as a real row, built on the shadcn `Skeleton` primitive. It is not the same component as the generic `RowSkeleton` in `components/shared/loading-skeleton.tsx`, which predates this family and uses a different height and border convention for its own (non-dashboard) consumers — use `LoadingRow` for anything following the Bordered Rows contract, `RowSkeleton` elsewhere.

**ASCII-Divider Variant, scoped to `/dashboard/overview` only.** `app/dashboard/overview/overview-content.tsx` renders its two row-groups (evaluation stages, upcoming events) with Unicode box-drawing (`┌─┐└┘├┤│`) divider _characters_ as real text content — a top/bottom/mid rule and a leading/trailing `│` on each row — instead of the `border`/`border-b` CSS properties every other Bordered Rows consumer uses. This is a deliberate, scoped exception (same pattern as the `AsciiBoot` note under ASCII Canvas above), not a system-wide replacement: `EvaluationStageRow`, `NodeMemberRow`, and `XpLedgerTable` all keep the plain CSS-border treatment described above unchanged. Extending this to any other Bordered Rows consumer is a separate, equally deliberate decision for later, not an automatic consequence of this one.

- **A font-fallback trade-off, checked directly and accepted, not assumed.** IBM Plex Mono is loaded via `next/font/google` with `subsets: ['latin']` (`app/layout.tsx`); the actual generated `@font-face` rules were inspected directly and none of their `unicode-range` blocks cover U+2500-257F (box drawing) or U+2580-259F (block elements) — Google doesn't offer that as a selectable subset for this font. These glyphs render in the stack's `'Courier New'` fallback rather than the page's own mono face. Accepted deliberately: these are simple line/corner shapes, not text, so a different (but still monospace, still terminal-compatible) font for just these characters reads as a minor rendering detail, not a voice inconsistency the way a label or name falling back would. This also means the `█` cursor in `AsciiBoot` (above) has always rendered in that same fallback, not IBM Plex Mono — a pre-existing gap this check surfaced, not something new. A prior version of this note used plain ASCII (`+`/`-`/`|`) instead specifically to avoid this trade-off; reverted once the trade-off was judged acceptable for shapes this simple.
- **Decorative structure, not content.** Every divider character is `aria-hidden="true"` — a screen reader never encounters them, only the real row content (which keeps its existing per-field `aria-label`s, unchanged from the CSS-border version). Covered by a test, not just left to a comment.
- **Same muted register already in use**, not a new color: `sidebar-foreground/40`, the same opacity already used on this page for the node-name label and "No record yet" text — no new token spent on decoration.
- Static only — no motion, matching the "static motif" direction this page's `AsciiBoot` flourish separately chose _not_ to take for its own moment (see ASCII Canvas above).

### Cards / Containers

- **Corner Style:** square (0).
- **Background:** solid white (`card` token; distinct from `paper`/`stone` — cards visually lift off the page background by being the one truly neutral white surface).
- **Shadow Strategy:** none — see Elevation & Depth. Depth via `ring-1 ring-foreground/10` only.
- **Border:** the 1px ring described above; a `sm` density variant tightens internal spacing to 0.75rem without changing the ring.
- **Internal Padding:** driven by `--card-spacing` (1rem default / 0.75rem compact).

### Inputs / Fields

- **Style:** hard square corners, transparent background, bottom-weighted vertical padding (`px-4 py-3` for the custom `Field` component; `px-2.5 py-1` for the bare shadcn `Input`), always paired with an uppercase mono label above it — never a placeholder-as-label pattern.
- **Focus:** border color shifts to full-strength ink/hero-ink (not a glow or ring) — a deliberately quiet, structural focus treatment matching the flat-elevation philosophy.
- **Error / Disabled:** error state turns the border `destructive` and surfaces a mono, small-caps error string wired to `aria-describedby`. Disabled/read-only drops to 50% opacity with `cursor-default`.
- **Surface-aware:** every field component takes a `surface: 'dark' | 'light'` prop — `light` for Paper/Stone contexts (navy text, muted-ink placeholder), `dark` for Maroon/Navy contexts (white text, translucent-white placeholder). This is a systemic pattern, not a one-off: any new form control on a colored surface should carry the same prop.

### Navigation

- **Style:** fixed, full-width, `4rem`-tall. Translucent black-tinted at rest, opaque/blurred (`backdrop-blur-md saturate-150`) once scrolled past 60px — except on maroon-variant pages (`/register`), which swap to a solid Maroon → Maroon-Dark shift instead of a blur. `/events` was removed from the maroon variant — it has no maroon hero to justify an opaque maroon bar (Paper background throughout), and Signal Maroon there was already spent on the event-type badge and active filter tab; a third maroon surface on the same page diluted the One Signal Rule rather than reinforcing it. It stayed on `default`, but the translucent-at-rest state assumes a dark hero sits directly behind the fixed bar (true on `/`, not on `/events`) — white nav text over `bg-black/10` on a light Paper page is close to unreadable. `/events` skips straight to the opaque/blurred treatment `default` otherwise only reaches after scrolling, so the bar is always legible there, never translucent.
- **Typography:** nav links are Space Grotesk, `text-sm font-medium`, generous letter-spacing; profile-menu items and the mobile-menu Dashboard/Logout CTAs switch to the mono/uppercase/tracked treatment.
- **States:** links go from 75% to full opacity on hover (no underline, no color change) — a restraint pattern distinct from body-copy links, which do use `underline-offset-4 hover:underline`.
- **Mobile:** full-screen Terminal Navy takeover (not a drawer), large display-weight nav links fading in from 50% to full opacity on hover, hamburger animates to an X via two independently rotating bars.
- **Dashboard variant** (any `/dashboard/*` route): shrinks to logo + profile-menu only — no `NAV_LINKS`, no hamburger, no mobile takeover of its own. `DashboardSidebar` already owns dashboard navigation on every breakpoint including mobile (its own "Menu" bar + takeover), so duplicating that here was the double-navbar bug this variant exists to fix. Flat `bg-sidebar`/`border-sidebar-border` instead of the scroll-driven translucency — `DashboardShell`'s content scrolls inside `main`'s own container, so the scroll listener that drives the public variants' blur can never fire here, and there's no hero behind the bar to justify translucency regardless. The profile-menu keeps Logout (the one thing `DashboardSidebar` still doesn't have) but drops its own "Dashboard" link, which is self-referential once you're already inside `/dashboard`. Still just a thin strip at every width, not a second `DashboardSidebar`-shaped mobile bar — the two remaining stacked bars on mobile (this one, then `DashboardSidebar`'s "Menu" row) are a deliberately smaller fix than folding Logout into `DashboardSidebar` itself.

### Breadcrumb

Quiet wayfinding, not a navigation bar — sized and voiced like the Label type role, not Body.

- **Style:** mono, uppercase, `text-[0.68rem]` tracked at `0.1em`, slash (`/`) separators at 50% opacity rather than a chevron icon.
- **States:** every crumb but the last is a link at `muted-foreground`, brightening to `foreground` on hover; the final crumb renders as plain text (not a link) carrying `aria-current="page"`.
- **Used on:** blog posts, handbook topics, dashboard detail pages — anywhere content sits more than one level deep.

### Dropdown Menu

Floating menu content — the one place a shadow is correct (see Elevation & Depth).

- **Style:** square corners (the `rounded-lg`/`rounded-md` classes on content and items still collapse to 0 through the token bridge, same as every other component), `p-1` outer padding, `shadow-md`/`shadow-lg` + `ring-1 ring-foreground/10` for separation from the page behind it.
- **Items:** `text-sm`, compact (`px-1.5 py-1`), no icon by default; a destructive variant tints text and focus-background with the `destructive` token at 10–20% opacity, matching the Destructive Button treatment rather than inventing a new red.
- **States:** focus/hover fills with `accent`; disabled drops to 50% opacity and stops accepting pointer events. Open/close is a 100ms scale+fade (`zoom-in-95`/`zoom-out-95`), not the slower page-level expo easing — floating UI gets a snappier, shorter transition than page content.
- **Separator:** a 1px `border` divider with negative margin to bleed to the menu's edges.

### CycleSelector

The first real consumer of the Dropdown Menu floating-panel chrome above (shadow + `ring-1 ring-foreground/10`, square corners), carrying dashboard-specific content instead of generic menu items — switches which advancement cycle `/dashboard/xp` and `/dashboard/evaluations` are viewing.

- **Not an ARIA listbox.** Its rows are real `<Link>`/`<button disabled>` elements, not `role="option"` — the outcome of picking a row is always page navigation, never a value reported into a form, so overriding native link semantics with a value-widget role would fight the element rather than describe it. Arrow-key roving focus, Home/End, and Escape-to-close are layered on top of the real elements instead, so every row stays reachable by plain Tab even without the enhancement.
- **Trigger label stays mono** (`CYCLE {label}`) — a cycle's label identifies which fixed period is selected, the same classify job `RoleBadge`/`TierBadge`/a Bordered Row's stage field do, not a narrated description.
- **No dedicated status color on the selector itself.** Cycle status (upcoming/active/closed) is reported by `StatusChip` (`domain="cycle"`) inside each row, not by a bespoke accent — an earlier draft layered a coral dot/border on the active row on top of its already-Maroon fill, which would have made Alert Coral mean "current" here and "something's wrong" everywhere else it appears; dropped for exactly that collision.
- **Selected ≠ active.** Which cycle is being _viewed_ (Maroon row fill, `aria-current="true"`, the same treatment `DashboardSidebar`'s current-page nav link already uses) and which cycle is _currently live_ for the club (`StatusChip`'s positive tone) are independent facts that can point at different cycles — they get two independent cues, never collapsed into one.
- **Upcoming cycles are listed but disabled** (`<button disabled>`, not a link) — a member can see one is coming without landing on a cycle that has no records yet.
- **Panel scrolls** (`max-h-64 overflow-y-auto`) rather than growing unbounded — cycles accumulate for the platform's life with no archival step, so this is the one control in the system explicitly built for an open-ended list rather than a small fixed set.
- **Surface-aware** like the rest of the dashboard family: `surface: 'dark' | 'light'`, defaulting `'dark'`.

### ASCII Canvas (signature component)

A 24fps ASCII-art animation rendered live behind the hero headline, sourced from a fetched text-frame asset (never bundled as a JS module — that cost 18.4MB in V1). It is the system's most literal expression of "The Systems Terminal": a real terminal-rendering technique used as a hero visual rather than a decorative illustration. Respects `prefers-reduced-motion` and pauses on tab-blur/off-screen — this component is the platform's clearest signature and should not be replicated elsewhere without equal restraint.

**Scoped exception: `AsciiBoot` on `/dashboard/overview`.** The "appears exactly once" rule above is deliberately overridden for this one screen — a conscious decision to give the personal-overview page some of the same "living system" character the public hero has, not an oversight, and not yet extended to `DashboardShell` or any other dashboard route. `AsciiBoot` (`components/shared/dashboard/ascii-boot.tsx`) is a distinct, much smaller sibling of `AsciiCanvas`, not the hero component reused verbatim, built for Operate mode's job (a fast status check) rather than the hero's Persuade-mode ambient loop:

- **Form:** a short boot-style type-in (a cursor blink, then `› LINKED: {NODE NAME}` — or `› LINKED: ARGC` for a member not yet in a node) that plays once per session, holds briefly, fades, then unmounts — never a continuous 24fps loop, never a permanent fixture. Plays at most once per session (`sessionStorage`), not once per mount — `/dashboard/overview` is the first dashboard sidebar link and refetches on every visit, so without this it would replay in full every single time.
- **Content is real, not invented flavor text.** The typed line names the member's actual node — genuine data already being fetched for the page, not a fabricated system-status claim. An earlier draft used a generic `SYS ONLINE` string; that shipped the mechanism without the personality the brief actually asked for, and risked reading as a real status indicator next to this page's genuine `StatusChip`s. Naming the real node instead fixes both problems at once.
- **Placement & weight:** quiet mono at `sidebar-foreground/40` (the same muted register as this page's other secondary labels), positioned above the node-name line — sized and weighted so it never competes with the XP number, which the page deliberately makes its one dominant element.
- **Mechanism:** the purely decorative cursor-blink preamble is still a fetched static text asset (`public/ascii/dashboard-boot.txt`), never a bundled JS module. The typed prompt text itself is generated in-component, not fetched — it's per-user data (the node name), which was never a candidate for a shared static asset in the first place, no different from `EVAL_STAGE_LABELS` or `formatEventDate` rendering real data elsewhere on this page without going through a fetch. Frames are still painted straight to `textContent` via a ref rather than through React state, the same reasoning `AsciiCanvas` documents. It skips `AsciiCanvas`'s `requestAnimationFrame` loop and visibility/tab-blur pause — machinery built to manage an animation that would otherwise run forever, which doesn't apply to a sequence that finishes in under two seconds regardless of tab focus.
- Respects `prefers-reduced-motion` by rendering nothing at all, rather than freezing on a mid-type frame — unlike the hero's canvas, no single frame here is a meaningful "still," since the motion itself is the point.
- **Exit is a combined height-collapse + fade**, not an abrupt unmount — the node-name/XP content below settles into place smoothly instead of jumping the instant the flourish disappears.

**Scoped exception: the Mission & Values shape ornament.** `components/features/landing/mission-values.tsx` renders one static ASCII shape (`content/ascii/shape-2.txt`, ported verbatim from V1) above the mission statement, at `text-[2.2px]` `font-black` `text-ink` (full opacity) — matching V1's own `SectionVision.tsx` treatment exactly, not a faded texture. Both `2.2px` and V1's `font-black` are off the documented type ramp and Space Grotesk's loaded-weight set respectively: `font-black` (900) has no true weight in IBM Plex Mono (Google serves this family only up to 700, confirmed identical in V1's own font config), so it renders as the browser's synthesized bold, on both sites, not a real weight — an accepted V1-parity trade-off, not a V2-only shortcut. `overflow-hidden` on the `<pre>` clips the raw monospace content at the column edge, since at `md` widths (before `lg`'s wider padding applies) the shape's real rendered width can exceed the mission column's — it must never visually cross the divider into the values column. Hidden below `md` (`hidden md:block`) and `aria-hidden="true"` at every width.

## Do's and Don'ts

### Do:

- **Do** keep every corner square. If a component needs to look "softer," solve it with color, spacing, or type — never with radius.
- **Do** use IBM Plex Mono uppercase-tracked text exclusively for system-state strings (roles, labels, tags, tiers) — never for headlines or body prose.
- **Do** use the `input` boundary token (not `border`) for any control edge that must meet WCAG 3:1 non-text contrast.
- **Do** treat Signal Maroon as the single "this matters" signal — one primary color doing one job.
- **Do** reach for the expo ease (`cubic-bezier(0.16, 1, 0.3, 1)`) for confident, settling motion; it's the system's default easing family.
- **Do** give every form control a `surface: 'dark' | 'light'` awareness when it can appear on both Paper and Maroon/Navy backgrounds.

### Don't:

- **Don't** add a `box-shadow` to anything at rest in the page flow (cards, buttons, fields). Shadow is reserved for floating overlays only.
- **Don't** let Alert Coral or Steel Blue compete with Signal Maroon for primary-action attention on the same screen.
- **Don't** shift Stone or Terminal Navy to Paper's new warm hue as a silent side effect of an unrelated change — Paper's move to warm (`oklch(0.955 0.0083 91.5)`) was a deliberate, isolated decision; whether Stone follows it into the same family is separate and not yet decided, so the two currently sit on different hue axes on purpose.
- **Don't** ship a stock, unthemed shadcn component. Every primitive routes through the ARGC token bridge in `app/globals.css`; a component that looks like default shadcn is a bug, not a shortcut.
- **Don't** import the ASCII frame data as a JS module — fetch it as a static text asset, exactly as `AsciiCanvas` and `AsciiBoot` both do.
- **Don't** replicate `AsciiCanvas`'s continuous 24fps hero loop anywhere else without an equally deliberate, documented exception — see ASCII Canvas above for the one scoped case (`AsciiBoot` on `/dashboard/overview`) that exists today.
