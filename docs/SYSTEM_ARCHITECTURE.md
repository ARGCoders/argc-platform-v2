# System Architecture & Requirements Document — ARGC Platform

## 1. System Overview & Core Mechanics

### 1.1 Mission

ARGC (Alliance of Resilient Giveback Coders) is a production-oriented engineering collective at 42 Amman. The platform serves as both a **public-facing website** (landing pages, blog, handbook) and an **internal member management system** (XP tracking, evaluations, nodes, events, voting, endorsements, advancement cycles).

### 1.2 Current Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5.x (strict) |
| UI Runtime | React | 19.2.4 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss`) | 4.x |
| Rich Text | BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn`) | 0.51.4 |
| Markdown | `react-markdown` + `remark-gfm` | 10.1.0 / 4.0.1 |
| Backend/BaaS | PocketBase (self-hosted on Railway) | 0.27+ |
| Auth Provider | 42 Intra OAuth (custom, no NextAuth) | — |
| Linting | ESLint v9 (`eslint-config-next`) | 9.x |
| Package Manager | npm / pnpm (both lockfiles present) | — |

### 1.3 Deployment

- **PocketBase**: hosted at `https://pocketbase-production-59e1.up.railway.app`
- **Next.js app** (not yet deployed to production — runs locally only)
- **Environment variables** (see `.env.example`): 42 OAuth credentials, PocketBase admin credentials, app URL

### 1.4 Architectural Constraint

**The frontend NEVER communicates directly with PocketBase.** All data flows through Next.js API routes or server-side admin client calls. This is the central security invariant.

### 1.5 Dynamic Routing & Content Sources

The app has three distinct content sources, each with a different routing pattern:

| Content Source | Routes | Resolution Pattern |
|---|---|---|
| **GitHub API** (`argc-handbook` repo) | `/handbook`, `/handbook/[section]/[topic]` | Contents API → raw markdown; `generateStaticParams` + 1h ISR |
| **PocketBase** (blog posts) | `/blog`, `/blog/[slug]` | Admin client query by slug; no pre-rendering |
| **PocketBase** (admin data) | `/dashboard/admin/*` | Admin client queries; fully dynamic |
| **Static/hardcoded** | `/events`, `/`, landing sections | Embedded in server components |

---

## 2. Data Flow & Caching

### 2.1 Authentication Flow

```
User → /api/auth/login
  → sets oauth_state cookie (CSRF, 10min)
  → redirects to 42 Intra OAuth
  → user authorizes → 42 redirects to /api/auth/callback
  → callback exchanges code for token (discards token immediately)
  → fetches /v2/me profile → finds/creates PocketBase user
  → authenticates via authWithPassword → gets session token
  → sets pb_auth (HttpOnly, 14d) and pb_role cookies
  → redirects to destination (or /dashboard for non-guests)
```

**Key details**:
- `pb_auth` cookie is the PocketBase session token (HttpOnly, Secure, SameSite=Lax)
- `pb_role` cookie is a plain-text role string used by `proxy.ts` middleware
- Access tokens from 42 are **never persisted** — exchanged and discarded
- User sessions are refreshed on every `/api/auth/me` call

### 2.2 Proxy / Middleware Gating

The `proxy.ts` file (at project root, NOT `middleware.ts` — this is a pre-Next.js-15 pattern) gates routes:

| Route Pattern | Requirement | Action on Failure |
|---|---|---|
| `/profile`, `/settings` | Any auth cookie | Redirect to `/register?next=pathname` |
| `/dashboard/*` | Auth + non-guest role | Redirect to `/register` (unauth) or `/` (guest) |
| `/register` | Must not be authenticated non-guest | Redirect to `/dashboard` (non-guests) |

The matcher pattern excludes `_next/*`, `api/*`, `favicon.ico`, and all image/svg files.

**Flaw**: `pb_role` cookie is set once at login and never refreshed. Admin role changes don't take effect in the middleware until the user re-authenticates.

### 2.3 Server-Side Data Fetching Pattern

```
Server Component (e.g., dashboard/admin/page.tsx)
  → lib/auth.ts: authenticate() reads pb_auth cookie, refreshes token
  → lib/pocketbase-server.ts: getAdminClient() — cached via React.cache(), authenticates as superuser
  → Queries PocketBase collections directly via PB SDK
  → Passes data as props to client components
```

`getAdminClient()` uses `React.cache()` to deduplicate across `generateMetadata`, layout, and page within the same render pass. The admin client auto-reauthenticates when the 1-hour token expires.

### 2.4 Client-Side Data Fetching Pattern

```
Client Component (e.g., Navbar, RegisterPage)
  → fetch('/api/auth/me') — validates token, returns user + refreshed cookie
  → For mutations: fetch('/api/admin/*') — POST/PATCH, server validates auth via requireSuperPeer()
  → router.refresh() triggers server re-render after mutations
```

**There is no global auth context/state.** Each client component that needs auth makes its own `/api/auth/me` call on mount. This is a deliberate "fetch when needed" pattern but results in N+1 auth requests on pages with multiple client components.

### 2.5 Handbook Data Flow (GitHub)

```
Handbook Index (handbook/page.tsx)
  → fetchHandbookSections():
      1. fetchContents("") → lists root folders
      2. For each folder: fetchContents(folder) → lists .md files
      3. For each .md file: fetchRaw(path) → downloads markdown
      4. extractSummary() → strips H1, finds first paragraph, cleans inline markdown
  → Returns HandbookSection[] with labels, slugs, summaries

Handbook Topic (handbook/[section]/[topic]/page.tsx)
  → generateStaticParams() → pre-renders all paths at build time
  → At request time: findFolder() → findFile() → fetchTopicMarkdown()
  → cleanMarkdown() strips the H1 and "← Back" footer
  → react-markdown renders with custom prose overrides
```

**Caching**: Every GitHub fetch uses `{ next: { revalidate: 3600 } }` (1-hour ISR). Combined with `export const revalidate = 3600` on the handbook pages, content updates appear within 1 hour without redeployment.

### 2.6 Caching Summary

| Layer | Mechanism | Scope | TTL |
|---|---|---|---|
| GitHub API data | `fetch()` `next.revalidate` | Handbook | 3600s |
| PocketBase admin client | `React.cache()` | Per render pass | Session |
| PocketBase session token | HttpOnly cookie | Auth | 14 days |
| User role (middleware) | Plain cookie | Gating | 14 days (stale) |
| API route responses | None | Dynamic | N/A |
| Blog posts | None | Dynamic per request | N/A |
| Client-side data | None | N/A | N/A |

### 2.7 State Management

- **No global state library** (no Redux, Zustand, Jotai, Context)
- All interactive components use local `useState`
- No React Context API usage anywhere
- No server actions (`'use server'`) — all mutations via REST API routes
- URL state only for OAuth redirect (`?next` param)

---

## 3. Functional Requirements

These are all features and behaviors that exist in the current codebase and **must be preserved** in the rebuild.

### 3.1 Public-Facing Pages

| Feature | Source | Status |
|---|---|---|
| **Home page**: Hero, ASCII animation, Vision/Mission, About/Programs, Contact | Static server components | ✅ Working |
| **Events page**: Hardcoded event list (future/past), status badges, hover animations | Static (SectionEvents) | ✅ Working |
| **Blog index**: Card grid with banner images, tags, author, date, read time | PocketBase (published posts) | ✅ Working |
| **Blog post detail**: Full article with prose styling, breadcrumb, author panel | PocketBase (HTML editor field) | ✅ Working |
| **Blog submit**: Auth-gated, BlockNote editor, image upload, tag input, validation | Client form → API | ✅ Working |
| **Handbook index**: Sections with topics, summaries, ordering by NN- prefix | GitHub API | ✅ Working |
| **Handbook topic**: React-markdown rendering, prev/next nav, breadcrumb, source link | GitHub raw markdown | ✅ Working |
| **Register page**: 42 Intra sign-in, existing submission check, application form | PB + 42 OAuth | ✅ Working |

### 3.2 Authentication & Authorization

- 42 Intra OAuth login (custom implementation, no NextAuth)
- Role-based access control (guest → node_peer → node_leader → super_peer → super_admin_peer)
- Session management via HttpOnly cookies (14-day expiry)
- `proxy.ts` middleware gating for protected routes
- API-level auth enforcement via `requireSuperPeer()` / `requireRole()`

### 3.3 Dashboard & Admin Features

| Feature | Details |
|---|---|
| **Dashboard shell** | Collapsible sidebar, role-based nav items, user info header |
| **Admin overview** | Aggregated stats cards (members, nodes, cycles, pending evals/endorsements), quick action grid |
| **Member management** | Searchable/filterable list, role change (super_admin only with confirmation) |
| **Member detail** | Full profile: XP ledger, stats, evaluations, votes, endorsements, node memberships — each with empty state |
| **Node management** | List/grid with member counts, status chips (active/inactive/archived) |
| **Cycle management** | CRUD lifecycle (upcoming → active → closed), date range, super_admin gating |
| **Event management** | List with type/status/proposer, event detail with attendance |
| **XP award** | Manual XP grants with category, cycle, note — super_admin only |
| **Endorsement verification** | Pending/verified/all filter tabs, verification with auto 25 XP award |
| **Vote overview** | Polarity summary, voter→subject rows, cross-node indicators |

### 3.4 Data Entities (PocketBase Collections)

1. **users** — Profiles with intra_id, role, avatar, display_name
2. **node** — Teams with name, slug, cohort, status
3. **node_member** — User-to-node membership with role, join/leave dates
4. **achievements** / **node_achievement** / **user_achievement** — Achievement system (defined but NYI in UI)
5. **advancement_cycles** — Time-bound evaluation cycles (upcoming/active/closed)
6. **xp_ledger** — All XP transactions with category, reference, cycle
7. **user_stats** — Per-cycle aggregated stats (XP, tier, evals, events, endorsements, votes)
8. **evaluations** — Peer evaluations with stage, status, score, scheduler
9. **events** / **event_attendance** — Events with type, status, roles, attendance
10. **votes** — Reputation voting with polarity and cross-node flag
11. **endorsements** — External endorsements with verification flow
12. **posts** — Blog posts with slug, tags, editor HTML content, author, status, publish date
13. **post_images** — Blog image uploads
14. **submissions** — Membership applications

### 3.5 Edge Cases & Behaviors

- **Unpublished blog posts** never appear on the frontend (status filter on blog index)
- **Blog submit validation**: title ≥ 5 chars, description ≥ 20 chars, content ≥ 100 visible chars
- **Registration race condition**: 409 conflict from parallel submissions handled gracefully
- **Handbook 404**: Failed folder/file resolution calls `notFound()`
- **Dashboard auth failure**: Error boundary with "Try again" button
- **Blog post error state**: "Something went wrong" with retry + back link
- **Events loading**: Pulse skeleton animation
- **Blog post loading**: Pulse skeleton with title/subtitle/avatar/content placeholders
- **Member detail**: Empty states for every data section ("No stats recorded yet", "No evaluations yet", etc.)
- **Admin pages**: Empty states for every list ("No members found", "No cycles defined", "No votes recorded")
- **Handbook**: "No sections yet" message with instructions to create a folder in the repo
- **ASCII animation**: Pauses when tab is hidden (visibility change), pauses when out of view (IntersectionObserver), respects `prefers-reduced-motion`
- **View transitions**: Animated page transitions with navbar exemption, disabled for reduced motion
- **Mobile**: Sticky navbar with hamburger menu, full-screen overlay, scroll lock, click-outside-to-close

### 3.6 Form Validation Rules

| Form | Fields | Rules |
|---|---|---|
| Register | cohort, motivation | motivation ≥ 80 chars |
| Blog Submit | title, description, tags, content, read_time | title ≥ 5, description ≥ 20, content ≥ 100 visible chars |
| Blog Image Upload | image file | max 5MB, jpg/png/webp/gif only |
| XP Award | member, amount, category, cycle, note | amount > 0, all required |
| Cycle Create | label, slug, start/end dates | all required |
| Role Change | (confirmation dialog) | super_admin_peer only |

---

## 4. UI/UX & Component Blueprint

### 4.1 Design System Tokens

All color tokens defined in `app/globals.css` using **OKLCH** color space. The brand palette:

| Token | Value | Usage |
|---|---|---|
| `argc-maroon` | `oklch(0.34 0.14 21)` | Primary brand color, hero backgrounds, buttons |
| `eng-navy` | `oklch(0.18 0.03 240)` | Body text, dashboard background |
| `coral` | `oklch(0.68 0.18 15)` | Accent color |
| `paper` | `oklch(0.97 0.013 75)` | Page background (warm cream) |
| `warm-stone` | `oklch(0.92 0.025 75)` | Section background |
| `steel-blue` | `oklch(0.42 0.07 225)` | Secondary UI elements |
| `mist` | `oklch(0.85 0.025 225)` | Light backgrounds |

Typography: `Space Grotesk` (sans, variable 400-700) + `IBM Plex Mono` (mono, 400-500). All font sizing uses `clamp()` for fluid scaling. Zero border radius everywhere (`--radius: 0rem`).

### 4.2 Mandatory Components for Rebuild

#### Layout & Navigation
- **RootLayout** — font loading, global CSS, `<Navbar>`, `<ViewTransition>` wrapper
- **Navbar** — sticky, scroll-aware (transparent → solid), mobile hamburger, auth state (avatar/dropdown), variant support (maroon vs default)
- **DashboardShell** — collapsible sidebar, mobile overlay, responsive padding
- **DashboardSidebar** — role-filtered nav items, collapse state, active link highlighting

#### Landing Page
- **Hero** — full-viewport, ASCII animation layer, headline, tagline, scroll indicator
- **AsciiCanvas** — 24fps animation loop, reduced-motion respect, out-of-view pause, intersection observer
- **AsciiRuler** — full-width ASCII divider (mobile hidden)
- **SectionVision** — 2-column grid (ASCII art + content), 3-phase roadmap, covenant
- **SectionAbout** — 5 program rows, hover effect, alternating backgrounds
- **SectionContact** — 4 contact rows, link vs text distinction

#### Content Display
- **SectionBlog** — async server component, card grid (1/2/3 column), banner with fallback, empty state, tags, author panel
- **BlogPostPage** — breadcrumb, prose body (`dangerouslySetInnerHTML`), 16:7 banner, author sidebar, prev/next
- **HandbookIndexPage** — numbered sections with maroon border, topic list with summaries, GitHub source link, empty state
- **HandbookTopicPage** — breadcrumb, react-markdown with full prose overrides, prev/next navigation, source link
- **SectionEvents** — hardcoded event rows, future/past badges, staggered animation

#### Forms & Inputs
- **Field / FieldArea** — reusable input/textarea with label, error state, dark/light surface variants, `aria-invalid` support
- **TagInput** — comma/Enter to add, click/Backspace to remove, lowercase sanitization, 24-char max, no duplicates
- **RichEditor** — BlockNote WYSIWYG, dynamic import (ssr: false), image upload integration, HTML output on change

#### Data Display (Dashboard)
- **StatCards** — linked overview cards with counts
- **MemberTable** — searchable/filterable, avatar + name + login + role badge
- **MemberDetailProfile** — user header, role selector, 6-section data grid with per-section empty states
- **XpLedgerTable** — scrollable, signed amounts (green/red), categories
- **NodeCard** — name, cohort, status chip, leader, member list
- **VoteRow** — polarity badge, voter/subject, reason, cross-node flag
- **EndorsementRow** — endorser info, message, status, verify action
- **CycleCard** — label, date range, status chip, toggle action
- **StatusChip** — color-coded badge (green=active/verified, yellow=pending/proposed, muted=closed/cancelled)

#### Shared Patterns
- **Loading skeletons** — pulse animation for blog post and events
- **Error boundaries** — per-segment error.tsx with retry button
- **Empty states** — descriptive message per context
- **Not-found pages** — global + blog-specific 404
- **Spinner** — rotating border animation
- **Breadcrumb** — used in blog posts and handbook topics

### 4.3 User Flows

#### Public Visitor
```
Home → Browse sections (Vision → About → Contact)
  → Blog (read posts, click into detail)
  → Events (view schedule)
  → Handbook (browse sections, read topics)
  → Register (sign in with 42 Intra, submit application)
```

#### Authenticated Member
```
Any page → Dashboard
  → Admin overview (if super_peer+)
  → Manage members, nodes, cycles, events
  → Award XP (if super_admin_peer)
  → Verify endorsements
```

#### Content Author
```
Blog Submit → Sign in with 42 (if not already)
  → Fill form (title, description, tags, editor content)
  → Submit → "X is in review" confirmation
  → Back to blog or submit another
```

### 4.4 Responsive Breakpoints

The codebase uses mobile-first with `md:` and `lg:` breakpoints. Key behaviors:
- **Mobile**: Single-column layouts, hamburger nav, hidden ASCII rulers, collapsed sidebar with overlay
- **Desktop**: 2-column grids, full sidebar, ASCII art visible, multi-column card grids
- **Typography**: `clamp()` values adjust fluidly across all viewports

---

## 5. Technical Debt & Refactoring Targets

### 5.1 Dead Code to Discard

| File | Reason |
|---|---|
| `app/components/SectionRegister.tsx` | Mock form with `setTimeout(1200)` — completely replaced by `app/register/page.tsx` which has real PB integration |
| `app/components/SectionPurpose.tsx` | Near-identical duplicate of `SectionAbout.tsx` with different background color; never imported in any page |
| `lib/pocketbase-client.ts` | Client-side PocketBase singleton defined but **never imported** in any component or page |
| `lib/shape-1.ts`, `lib/shape-2.ts` | Large ASCII art strings — only used by `SectionVision.tsx`. Consider inlining or moving to assets. |

### 5.2 Architectural Flaws

#### 5.2.1 `proxy.ts` Is the Wrong Convention
Next.js 15+ requires `middleware.ts` at the project root for edge middleware. The current `proxy.ts` file exports a named `proxy()` function with a `config` object, but there is **no registration** of this middleware in `next.config.ts` or via the standard `middleware.ts` convention. This likely means **route gating is not actually working in the running app** — the file exists but no Next.js mechanism picks it up.

**Fix**: Rename to `middleware.ts` with a default export, or verify if a custom server/entry point registers it.

#### 5.2.2 No Auth Context Provider
Every client component that needs auth (`Navbar`, `RegisterPage`, `BlogSubmitPage`) calls `fetch('/api/auth/me')` independently on mount. This duplicates network requests and introduces race conditions. There is no `AuthProvider` wrapping the app.

**Fix**: Create a React context-based auth provider in the root layout, with a single initial fetch and downstream `useAuth()` hook.

#### 5.2.3 Stale `pb_role` Cookie in Middleware
The `pb_role` cookie is set during login/callback but never refreshed. If an admin changes a user's role, the middleware continues using the old role until the user re-authenticates.

**Fix**: Either check role from PocketBase in the middleware (by decoding the PB session token) or refresh the cookie on every API call.

#### 5.2.4 No HTTP Caching on API Routes
All `/api/admin/*` and `/api/blog/*` responses are fully dynamic with no `Cache-Control`, `ETag`, or `stale-while-revalidate` headers. This means every page load and interaction triggers a fresh PocketBase query.

**Fix**: Add appropriate caching headers based on data freshness needs. Blog index could use ISR; admin data could use short `stale-while-revalidate`.

#### 5.2.5 `dangerouslySetInnerHTML` in Blog Posts
The blog post page uses `dangerouslySetInnerHTML` to render PocketBase's editor HTML output. The code comments claim this is safe because it's server-side rendered from PocketBase's sanitized HTML, but it's still a fragile pattern — any XSS vulnerability in PocketBase's HTML sanitization becomes a site-wide issue.

**Fix**: Render blog content through a proper sanitization library (DOMPurify on server) or migrate from PB's editor field to a controlled markdown/block-based format.

#### 5.2.6 `SectionBlog` Silently Swallows Errors
The `SectionBlog` component wraps the entire PocketBase fetch in a bare `try/catch` that sets `posts = []` on failure. Any failure (network, auth timeout, PB downtime) renders "No posts published yet" — indistinguishable from genuinely having no posts.

**Fix**: Differentiate between "no posts" and "failed to load." Show an inline error or fallback.

#### 5.2.7 Broken Dashboard Sidebar Links
The `DashboardSidebar` includes navigation items for `/dashboard/overview`, `/dashboard/xp`, `/dashboard/node`, `/dashboard/evaluations`, `/dashboard/events`, and `/dashboard/vote` — but **none of these routes have page files**. Clicking them leads to 404.

**Fix**: Either implement the pages or remove the sidebar links. Ship half the dashboard if the other half doesn't exist.

#### 5.2.8 `SectionEvents` Is Entirely Hardcoded
The events page renders a static array of event objects with hardcoded dates (April–September 2025). This is disconnected from the PocketBase `events` collection which has a full schema with types, statuses, organizers, and attendance tracking.

**Fix**: Connect the public events page to the PB `events` collection, filtering for `is_public = true`.

#### 5.2.9 Duplicate Auth Logic in Dashboard
The dashboard layout (`layout.tsx`) and the dashboard root page (`page.tsx`) both independently validate auth and fetch user data. The page duplicates logic the layout already handled.

**Fix**: The layout should pass the authenticated user as a prop or via context, not re-fetch.

#### 5.2.10 Handbook Label Transformation Is Non-Localizable
The `folderToLabel()` and `fileToLabel()` functions use simple split-on-hyphen + capitalize logic. This produces incorrect labels for multi-word names (e.g., `"who-we-are"` → `"Who We Are"` is correct, but edge cases with abbreviations or non-English content will break).

**Fix**: Consider using the NN- prefix strictly for ordering and maintain an optional metadata file for display names.

### 5.3 Code Quality Issues

| Issue | Location | Impact |
|---|---|---|
| `SectionAbout` / `SectionPurpose` ~90% identical | Components | Maintenance burden — changes must be duplicated |
| Blog `PostRecord` type defined inline in `route.ts` rather than in `types/pocketbase.ts` | `app/api/blog/route.ts` | Type fragmentation, inconsistency risk |
| No loading states for admin pages | All admin page.tsx files | Full-page blocking on slow connections |
| No error boundaries on admin pages | Dashboard has one generic boundary | Single error crashes entire admin panel |
| All font weights loaded (400-700) | `layout.tsx` | Unnecessary bytes — 400, 500, 700 are used; 600 is not |
| Mixed package managers | `package-lock.json` + `pnpm-lock.yaml` | CI/CD consistency risk |
| `asc` utility imported but only `desc` sorting used in API routes | Several admin route files | Dead import |

### 5.4 Security Considerations

| Issue | Severity | Notes |
|---|---|---|
| Access tokens from 42 not persisted | ✅ Good | Discarded immediately after callback |
| HttpOnly cookies for auth | ✅ Good | Not accessible from JS |
| No CSRF on API mutations | ⚠️ Medium | API routes use cookie auth; no CSRF token check |
| Role check is client-side in dashboard | ⚠️ Low | Sidebar hides admin links based on `user.role` — server `requireSuperPeer()` enforces on API routes |
| No rate limiting on API routes | ⚠️ Medium | `/api/auth/login`, `/api/register` have no throttling |

---

### Document Metadata

- **Author**: Senior Software Architecture Review
- **Date**: 2026-07-28
- **Codebase**: ARGC Platform (`@/` root at `/home/aabusnin/Desktop/save-projects/ARGC/argc_platform`)
- **Purpose**: Pre-rebuild system documentation for new v2 frontend architecture
