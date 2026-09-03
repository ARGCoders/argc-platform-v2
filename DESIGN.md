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

Color is deliberate but not loud: Signal Maroon is used sparingly and always with intent (primary actions, the one accent that means "this matters"), while the rest of the palette sits in a tight cool-neutral band so nothing competes with it. The pairing of a confident geometric sans (Space Grotesk) for voice and a monospace face (IBM Plex Mono) for system-state text (labels, roles, tags) reinforces the terminal read: prose speaks, mono reports.

This is an explicit departure from two things: the generic shadcn/SaaS look (primitives are adopted but rethemed, never left stock) and V1's warm-cream (`#FAF8F2`) base, which cast a sepia tint incompatible with the cool, technical register this system commits to.

**Key Characteristics:**

- Every corner is square — `--radius: 0` is a brand rule, not an unset default.
- Flat at rest; shadows appear only on floating overlay surfaces (menus, dialogs).
- Mono + uppercase + wide tracking marks anything the system is "reporting" (roles, labels, tags) as distinct from anything the system is "saying" (headlines, body copy).
- Maroon is rare and load-bearing; when it shows up, it means primary action or live/alert state.
- Motion favors an expo ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) — a fast, confident settle, not a bouncy or lingering one.

## Colors

A tight cool-neutral base with one warm, load-bearing accent; nothing competes with Signal Maroon for attention.

### Primary

- **Signal Maroon** (`oklch(0.34 0.14 21)` / `#7A1D22`): the hero background, primary buttons, active/ring states, and anywhere the interface commits to an action. Two tonal steps exist — **Signal Maroon Dark** (`oklch(0.26 0.12 21)` / `#421016`) for the scrolled navbar on maroon-variant pages, and **Signal Maroon Light** (`oklch(0.44 0.14 21)` / `#9E2A32`) which reads better than the base on Terminal Navy in dark contexts.

### Secondary

- **Steel Blue** (`oklch(0.42 0.07 225)` / `#3C5F77`): secondary buttons and chart series. A cooler, quieter counterpart to maroon — used when an action exists but isn't the primary one. **Steel Blue Dark** (`oklch(0.28 0.06 225)`) is its dashboard/dark-surface step; **Mist** (`oklch(0.85 0.025 225)` / `#CBD4DF`) is its palest tint, used for dashboard sidebar foreground text.

### Tertiary

- **Alert Coral** (`oklch(0.68 0.18 15)` / `#E8635A`): the single sharpest accent in the system. Used deliberately rarely — chart highlight, accent state — never as a second primary.

### Status Accents

Two chip-only accents, each sharing Alert Coral's lightness and chroma (`0.68` / `0.18`) with only the hue rotated — a family of equally-loud, equally-rare signals rather than an open palette. Neither ever fills a page-scale region; both live exclusively inside an outlined `StatusChip` or a `TierBadge` step.

- **Signal Green** (`oklch(0.68 0.18 145)`): `StatusChip`'s positive/complete tone — `completed`, `approved`, `published`, `active`.
- **Signal Amber** (`oklch(0.68 0.18 78)`): the Architect step of `TierBadge` only. `StatusChip`'s neutral tone stays on the ambient border/text of its surface rather than introducing a third chip hue.

### Neutral

- **Terminal Navy** (`oklch(0.18 0.03 240)` / `#0F1720`): the dashboard background and the mobile full-screen menu. This is the "console" surface — cool, near-black, hue-240.
- **Paper** (`oklch(0.98 0.003 240)`): the public-site page background. Deliberately cool (hue-240, near-zero chroma), not V1's warm cream.
- **Stone** (`oklch(0.94 0.005 240)`): the alternating section background on paper, one step down from Paper.
- **Ink** (`oklch(0.18 0.03 240)`) / **Ink Muted** (`oklch(0.42 0.015 240)`): text on Paper/Stone surfaces, full and muted weight.
- **Hero Ink** (`oklch(1 0 0)`) / **Hero Ink Muted** (`oklch(0.78 0.04 25)`) / **Hero Ink Dim** (`oklch(0.6 0.05 25)`): text on Maroon/Navy surfaces, three weights of emphasis.
- **Border** (`oklch(0.84 0.006 240)`): decorative dividers and card outlines only — not for anything that must be perceivable as a control boundary.
- **Input Boundary** (`oklch(0.6 0.012 240)`): the token for any form-control edge. Deliberately darker than `border` — measured 3.74:1 on Paper and 3.32:1 on Stone, meeting WCAG 2.1 SC 1.4.11's 3:1 non-text contrast requirement. Never substitute `border` for a control edge.

### Named Rules

**The One Signal Rule.** Signal Maroon is the only color that means "act here" or "this is live." It never shares that job with Alert Coral or Steel Blue — if two colors compete for primary-action attention on one screen, one of them is wrong.

## Typography

**Display/Body Font:** Space Grotesk (with system-ui, sans-serif fallback), weights 400/500/700 only — 600 is deliberately excluded (unused, so not loaded).
**Label/Mono Font:** IBM Plex Mono (with Courier New, monospace fallback), weights 400/500.

**Character:** Confident display type carries the voice — Space Grotesk pushes large and bold in the hero, medium weight elsewhere — while IBM Plex Mono stays a small, technical accent reserved for anything reporting system state rather than speaking to the visitor.

### Hierarchy

- **Display** (700, `clamp(3rem, 7vw, 5.5rem)`, line-height 1.04, tracking -0.025em): the hero headline only. `text-wrap: balance` keeps line breaks intentional.
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
- **StatusChip** — a process state on a record (cycle, evaluation, event, post, submission). Always outline-only, never filled — fills are reserved for rank. Three tones only: Signal Green (positive/complete), Alert Coral (negative/blocking), or the ambient neutral border/text of whatever surface it renders on (pending/in-progress) — on Terminal Navy that's `hero-ink/55`, the same measured 3:1 dark-surface boundary `Field` already uses, not the decorative `sidebar-border` hairline. Positive and negative tones also differ in border style (solid vs. dashed), not just hue, since Signal Green and Alert Coral share lightness/chroma. Takes a `surface: 'dark' | 'light'` prop like any other surface-aware control.
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

- **Style:** fixed, full-width, `4rem`-tall. Translucent black-tinted at rest, opaque/blurred (`backdrop-blur-md saturate-150`) once scrolled past 60px — except on maroon-variant pages (`/events`, `/register`), which swap to a solid Maroon → Maroon-Dark shift instead of a blur.
- **Typography:** nav links are Space Grotesk, `text-sm font-medium`, generous letter-spacing; profile-menu items and the mobile-menu Dashboard/Logout CTAs switch to the mono/uppercase/tracked treatment.
- **States:** links go from 75% to full opacity on hover (no underline, no color change) — a restraint pattern distinct from body-copy links, which do use `underline-offset-4 hover:underline`.
- **Mobile:** full-screen Terminal Navy takeover (not a drawer), large display-weight nav links fading in from 50% to full opacity on hover, hamburger animates to an X via two independently rotating bars.

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

### ASCII Canvas (signature component)

A 24fps ASCII-art animation rendered live behind the hero headline, sourced from a fetched text-frame asset (never bundled as a JS module — that cost 18.4MB in V1). It is the system's most literal expression of "The Systems Terminal": a real terminal-rendering technique used as a hero visual rather than a decorative illustration. Respects `prefers-reduced-motion` and pauses on tab-blur/off-screen — this component is the platform's clearest signature and should not be replicated elsewhere without equal restraint; it works because it appears exactly once.

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
- **Don't** reintroduce a warm/cream neutral base — the cool hue-240 axis (Paper/Stone/Terminal Navy) is a confirmed rejection of V1's sepia-tinted look.
- **Don't** ship a stock, unthemed shadcn component. Every primitive routes through the ARGC token bridge in `app/globals.css`; a component that looks like default shadcn is a bug, not a shortcut.
- **Don't** import the ASCII frame data as a JS module — fetch it as a static text asset, exactly as the existing `AsciiCanvas` component does.
