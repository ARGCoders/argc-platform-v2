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

### 3.1. Blog Index Page

**Current Flaw:** The giant maroon hero section is wasted space and visually unbalanced.
**Upgrade:**

- **Hero Section:** Remove the solid maroon background block. Use a stark, typographic header directly on the `--color-paper` background. The title "From the collective." should be massive, left-aligned, and set in `--color-ink`.
- **Grid Layout:** Display posts in a strict, uniform CSS grid.
- **Article Cards:**
  - **Border:** 1px solid `--color-border`[cite: 1].
  - **Geometry:** Sharp corners (0rem radius)[cite: 1].
  - **Image:** Aspect ratio 16:9, grayscale by default, revealing full color on hover to maintain a subdued resting state.
  - **Metadata:** Use `IBM Plex Mono` for the date and tags (e.g., `[ANNOUNCEMENTS]`, `[WELCOME]`) set in small uppercase text, colored with `--color-ink-muted`.
  - **Hover State:** Lift the card with a smooth transition (the `--animate-row-rise` keyframe is entry-only — replaying it on hover flickers the card out from `opacity: 0`) and a 2px bottom border highlight using `--color-argc-maroon`.

### 3.2. Article Page

**Current Flaw:** The layout is disjointed, tags look like standard buttons, and the content width feels poorly constrained.
**Upgrade:**

- **Container:** Constrain the reading width to a maximum of `65ch` to ensure optimal readability. Center the container on the page.
- **Header Module:**
  - **Breadcrumbs:** Monospaced, using `/` as separators.
  - **Title:** Large, tight line-height, `--color-ink`.
  - **Metadata Row:** Author and date aligned left, separated by a structural divider (e.g., `—`), set in monospace.
  - **Cover Image:** Full bleed across the container width, zero border radius.
- **Article Body (`.article-body` class rules)[cite: 1]:**
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
- Pages should enter using the `page-enter` animation (12px Y-axis rise over 220ms)[cite: 1].
- Never animate the fixed navbar (`site-header`) during transitions[cite: 1].
