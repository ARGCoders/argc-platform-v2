# ARGC Blog Design Specification

## 1. Core Principles

ARGC is a production-oriented engineering collective, not a generic SaaS startup or a social club[cite: 1, 7]. The blog’s visual language must reflect this reality.

- **Utilitarian & Structured:** Function dictates form. Content must be highly legible and logically structured.
- **Zero-Radius Geometry:** Hard edges only. No rounded corners anywhere on the platform (`--radius: 0rem`)[cite: 1].
- **Anti-SaaS Aesthetic:** Avoid floating pill tags, soft drop-shadows, and massive empty hero banners[cite: 1].

## 2. Typography & Color

Rely strictly on the tokens defined in `global.css`[cite: 1].

- **Fonts:**
  - Primary Sans: `Space Grotesk` (`--font-sans`)[cite: 1].
  - Monospace: `IBM Plex Mono` (`--font-mono`) for code, tags, and metadata[cite: 1].
- **Surfaces:**
  - Page background must use `--color-paper`[cite: 1].
  - Alternating sections or card backgrounds must use `--color-stone`[cite: 1].
  - Code blocks and technical surfaces must use `--color-eng-navy`[cite: 1].
- **Text:**
  - Primary text on light surfaces: `--color-ink`[cite: 1].
  - Muted metadata: `--color-ink-muted`[cite: 1].
  - Accents and links: `--color-argc-maroon`[cite: 1].

## 3. Component Specifications

### 3.0. Global Site Header (Navbar)

**Rule:** The navbar must seamlessly integrate with the maroon brand identity.

- **Background:** Must be `--color-argc-maroon` (or transparent if sitting directly over a `--color-argc-maroon` hero section like the homepage). Absolutely **NO** `--color-eng-navy` for top navigation.
- **Text & Links:** Use `--color-hero-ink` (white) for high contrast against the maroon.
- **Transitions:** The navbar is pinned (`z-index: 100`) and explicitly excluded from View Transitions to prevent it from detaching and sliding during page navigations[cite: 1].

### 3.1. Blog Index Page

**Current Flaw:** The previous design used a massive, empty maroon block that looked like a broken hero section.
**Upgrade:**

- **Header Integration:** The global maroon navbar remains at the top.
- **Page Background:** The main body of the blog index sits on `--color-paper`[cite: 1].
- **Page Title:** No giant maroon hero block. A stark, large, left-aligned typographic header ("From the collective.") directly on the `--color-paper` background, set in `--color-ink`.
- **Width:** The index runs wide — up to `90rem` — so the listing reads like a log rather than a gallery.
- **Index Bar:** A bordered `Latest` / `N POSTS` rule separates the header from the listing.
- **Post Rows (not a card grid):** Posts are full-width horizontal rows, each a whole-row `Link` to `/blog/[slug]`, separated by a `1px` `--color-border`[cite: 1] rule:
  - **Thumbnail:** 16:9, sharp corners (0rem radius)[cite: 1], grayscale by default, full color on hover; a deterministic `BannerPlaceholder` stands in when the post has no banner.
  - **Metadata:** `IBM Plex Mono` for the date and tags[cite: 1], small uppercase, `--color-ink-muted`[cite: 1].
  - **Title & Description:** `Space Grotesk`, `--color-ink`.
  - **Hover:** A trailing `READ →` affordance.

### 3.2. Article Page

**Current Flaw:** The layout is disjointed, tags look like standard buttons, and the content width feels poorly constrained.
**Upgrade:**

- **Container:** A single column, up to `80rem` wide, centered. No sidebar.
- **Back Navigation:** The breadcrumb bar (monospace, `/` separators, bottom `--color-border` rule) is the only back affordance — no back buttons.
- **Header Module:**
  - **Kicker:** The post's first tag (uppercase, `--color-argc-maroon`, monospace) preceded by a small maroon square; falls back to "Field notes".
  - **Title:** Large, tight line-height (`1.04`), `--color-ink`.
  - **Metadata Row:** Author + date + read time in `--color-ink-muted` monospace, separated by a `border-top` divider and `·` separators.
  - **Cover Image:** Full bleed across the container width, `16:7` aspect, `1px` `--color-border`, zero border radius.
- **Tags:** Max-width `46rem`, monospaced bracket labels (see §3.3).
- **Article Body (`.article-body` class rules)[cite: 1]:** Constrained to `max-w-[46rem]` for comfortable reading; keep the typography rules below.
  - **Headers (h2, h3, h4):** Bold, tight letter-spacing (`-0.01em`)[cite: 1].
  - **Blockquotes:** 2px solid left border using `--color-argc-maroon`, italicized[cite: 1].
  - **Code Blocks:** Must sit on `--color-eng-navy` with `--color-hero-ink` text to contrast against the page[cite: 1].
  - **Links:** Underlined with a 3px offset, thickness increases to 2px on hover[cite: 1].
  - **Tables:** Collapse borders, use `--color-stone` for header backgrounds[cite: 1].

### 3.3 Tags & Badges

- Do not use pill shapes.
- Tags should look like technical labels: Monospaced font, all-caps, enclosed in brackets (e.g., `[ ENGINEERING ]`) or styled as sharp rectangles with a 1px `--color-border` and `--color-stone` background.

## 4. Motion

- Rely entirely on the View Transitions API and defined keyframes in `global.css`[cite: 1].
- Pages cross-fade: `page-exit` and `page-enter` are calm, minimal pure-opacity transitions (no translate, no drift) — 400ms ease, in lockstep so the old and new pages dissolve into each other[cite: 1].
- The `page` snapshot is pinned (`::view-transition-group(page) { animation: none }`) — the cross-fade is the only motion, never a morph.
- Never animate the fixed navbar (`site-header`) during transitions[cite: 1].
- `<Link>` (not plain `<a>`) must be used for internal navigation — client-side navigation is what fires the transition.
