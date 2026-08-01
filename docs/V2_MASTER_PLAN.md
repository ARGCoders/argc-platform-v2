# ARGC Platform V2 — Master Plan

> Source of truth for the full rebuild lifecycle. All architectural decisions, constraints, and phase ordering are defined here. Deviations must be justified against this document.

---

## 1. Environment & Prerequisites

### 1.1 Tech Stack

| Layer | Technology | Version Constraint |
|---|---|---|
| Framework | Next.js (App Router) | 15.x (not 16) |
| Language | TypeScript | 5.x — strict mode, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`. **No `any`** — exceptions reviewed per-case. |
| Package Manager | `pnpm` | Latest. No `npm` or `yarn` lockfiles permitted. |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/postcss`. No `tailwind.config.ts`. |
| Component Library | Shadcn/UI | Latest. Initialize with `--tailwind-v4` flag. Square radius (`0rem`), neutral gray. |
| Runtime | React | 19.x (shipped with Next.js 15) |
| Backend/BaaS | PocketBase | 0.27+ (self-hosted on Railway) |
| Markdown Rendering | `react-markdown` + `remark-gfm` | Latest compatible |
| HTML Sanitization | `isomorphic-dompurify` | Server-only wrapper (`lib/sanitize.ts`) |
| Rich Text Editing | `@blocknote/core` + `@blocknote/react` + `@blocknote/shadcn` | Phase 5+ |
| Auth Provider | 42 Intra OAuth | Custom implementation (no NextAuth) |
| Linting | ESLint v9 + `eslint-config-next` | Flat config |
| Git Workflow | Conventional Commits | `feat(scope):`, `fix(scope):`, `chore:`, `refactor:`, etc. |

### 1.2 Environment Variables

```
NEXT_PUBLIC_42_CLIENT_ID=        # 42 Intra OAuth client ID
FORTYTWO_CLIENT_SECRET=          # 42 Intra OAuth client secret (server-only)
FORTYTWO_REDIRECT_URI=           # OAuth callback URL
NEXT_PUBLIC_POCKETBASE_URL=      # PocketBase instance URL
POCKETBASE_ADMIN_EMAIL=          # PB superadmin email (server-only)
POCKETBASE_ADMIN_PASSWORD=       # PB superadmin password (server-only)
NEXT_PUBLIC_APP_URL=             # Public app URL (defaults to localhost:3000)
```

### 1.3 Remote Image Patterns (next.config.ts)

```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.intra.42.fr', pathname: '/**' },
    { protocol: 'https', hostname: 'pocketbase-production-59e1.up.railway.app', pathname: '/api/files/**' },
  ],
}
```

### 1.4 PocketBase Collections (Data Layer)

See `types/pocketbase.ts` for all interface definitions. Collections:

| Collection | Type | Used By |
|---|---|---|
| `users` | Auth | Auth, Members, all features |
| `posts` | Base | Blog |
| `submissions` | Base | Registration |
| `node` | Base | Dashboard |
| `node_member` | Base | Dashboard |
| `advancement_cycles` | Base | Dashboard |
| `xp_ledger` | Base | Dashboard |
| `user_stats` | Base | Dashboard |
| `evaluations` | Base | Dashboard |
| `events` | Base | Events page + Dashboard |
| `event_attendance` | Base | Dashboard |
| `votes` | Base | Dashboard |
| `endorsements` | Base | Dashboard |
| `achievements` | Base | Dashboard (future) |
| `post_images` | Base | Blog |
| `node_achievement` | Base | Dashboard (future) |
| `user_achievement` | Base | Dashboard (future) |

---

## 2. Scalable Folder Structure

Strict "Feature-Sliced" layout. Every file has one home.

```
├── middleware.ts                    # Edge middleware (route gating)
├── next.config.ts                   # Next.js configuration
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
├── .env
├── .env.example
│
├── app/                             # Next.js App Router
│   ├── layout.tsx                   # Root layout (fonts, AuthProvider, Navbar)
│   ├── page.tsx                     # Home page
│   ├── error.tsx                    # Root error boundary
│   ├── not-found.tsx                # Global 404
│   ├── loading.tsx                  # Root loading (skeleton)
│   ├── globals.css                  # Tailwind v4 + design tokens + shadcn vars
│   │
│   ├── (public)/                    # Route group — public pages (no layout nesting)
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── [slug]/page.tsx
│   │   │   └── submit/page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   ├── error.tsx
│   │   │   └── loading.tsx
│   │   ├── handbook/
│   │   │   ├── page.tsx
│   │   │   ├── lib.ts               # GitHub API fetching + markdown utils
│   │   │   └── [section]/[topic]/page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── api/                         # API route handlers
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── callback/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── blog/
│   │   │   ├── route.ts
│   │   │   ├── [slug]/route.ts
│   │   │   ├── submit/route.ts
│   │   │   └── upload-image/route.ts
│   │   ├── register/route.ts
│   │   └── admin/
│   │       ├── stats/route.ts
│   │       ├── members/
│   │       │   ├── route.ts
│   │       │   └── [userId]/route.ts
│   │       ├── nodes/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── cycles/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── events/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── evaluations/route.ts
│   │       ├── endorsements/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── votes/route.ts
│   │       └── xp/award/route.ts
│   │
│   └── dashboard/                   # Dashboard (protected route group)
│       ├── layout.tsx               # Auth gate layout
│       ├── page.tsx                 # Role-based redirect hub
│       ├── error.tsx
│       ├── loading.tsx
│       └── admin/
│           ├── page.tsx
│           ├── members/
│           │   ├── page.tsx
│           │   └── [userId]/page.tsx
│           ├── nodes/page.tsx
│           ├── events/page.tsx
│           ├── votes/page.tsx
│           ├── cycles/page.tsx
│           ├── endorsements/page.tsx
│           └── xp/award/page.tsx
│
├── components/
│   ├── ui/                           # Base shadcn components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── skeleton.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── separator.tsx
│   │
│   ├── features/                     # Smart components grouped by domain
│   │   ├── auth/
│   │   │   ├── auth-provider.tsx     # AuthProvider context
│   │   │   ├── auth-hooks.ts         # useAuth() hook
│   │   │   ├── login-gate.tsx        # 42 Intra sign-in gate
│   │   │   └── identity-panel.tsx    # Avatar + name + role display
│   │   ├── blog/
│   │   │   ├── blog-card.tsx
│   │   │   ├── blog-grid.tsx
│   │   │   ├── blog-submit-form.tsx
│   │   │   ├── rich-editor.tsx       # BlockNote wrapper
│   │   │   └── tag-input.tsx
│   │   ├── dashboard/
│   │   │   ├── dashboard-shell.tsx   # Sidebar + main area wrapper
│   │   │   ├── dashboard-sidebar.tsx # Role-filtered nav
│   │   │   ├── stat-cards.tsx
│   │   │   ├── member-table.tsx
│   │   │   ├── member-detail.tsx
│   │   │   ├── xp-ledger-table.tsx
│   │   │   ├── node-card.tsx
│   │   │   ├── vote-row.tsx
│   │   │   ├── endorsement-row.tsx
│   │   │   ├── cycle-card.tsx
│   │   │   └── status-chip.tsx
│   │   ├── events/
│   │   │   ├── event-list.tsx
│   │   │   └── event-row.tsx
│   │   ├── handbook/
│   │   │   ├── handbook-index.tsx
│   │   │   └── handbook-topic.tsx
│   │   └── landing/
│   │       ├── hero.tsx
│   │       ├── ascii-canvas.tsx
│   │       ├── ascii-ruler.tsx
│   │       ├── section-vision.tsx
│   │       ├── section-about.tsx
│   │       └── section-contact.tsx
│   │
│   └── shared/                       # Global reusable components
│       ├── navbar.tsx
│       ├── empty-state.tsx           # Universal empty state
│       ├── loading-skeleton.tsx      # Universal skeleton wrapper
│       ├── error-fallback.tsx        # Universal error fallback
│       ├── breadcrumb.tsx
│       ├── spinner.tsx
│       ├── field.tsx                  # Reusable input/textarea with label
│       └── banner-placeholder.tsx
│
├── lib/
│   ├── api/                          # Isolated fetch helpers
│   │   ├── 42-api.ts                 # 42 Intra OAuth helpers
│   │   └── github.ts                 # GitHub Contents API + raw fetch
│   ├── auth.ts                       # Server-side auth utilities
│   ├── auth-context.tsx              # React Context provider + hook
│   ├── constants.ts                  # Route prefixes, role hierarchy, enums
│   ├── env.ts                        # Lazy env proxy (server-only)
│   ├── pocketbase-server.ts          # Admin client (+ globalThis singleton)
│   ├── sanitize.ts                   # isomoprhic-dompurify wrapper
│   └── utils.ts                      # Shared helpers (stripHtml, etc.)
│
├── types/
│   └── pocketbase.ts                 # ALL PocketBase interfaces, one file
│
├── public/
│   └── logo_argc.svg
│
└── scripts/
    └── setup-collections.mjs         # PocketBase collection bootstrap
```

### 2.1 Import Conventions

| Source | Import Pattern | Example |
|---|---|---|
| Types | `@/types/pocketbase` | `import type { UserRecord } from '@/types/pocketbase'` |
| Components | `@/components/{ui,features,shared}/...` | `import { Button } from '@/components/ui/button'` |
| Lib | `@/lib/...` | `import { authenticate } from '@/lib/auth'` |
| API helpers | `@/lib/api/...` | `import { fetchIntraUser } from '@/lib/api/42-api'` |

---

## 3. Strict Architectural Constraints (The Rules)

These **cannot be violated**. Any code merged that breaks these rules must be reverted.

### C1: Next.js 15 Async APIs

`cookies()`, `headers()`, route `params`, and `searchParams` are Promises. They **must** be awaited:

```typescript
// ✅ CORRECT
const cookieStore = await cookies()
const { slug } = await params

// ❌ WRONG — will fail at runtime in Next.js 15
const cookieStore = cookies()
const { slug } = params
```

**Not affected**: `middleware.ts` — `req.cookies` is synchronous.

### C2: Tailwind v4 — No Config File

- No `tailwind.config.ts` is created or maintained.
- All brand tokens go in `app/globals.css` inside a `@theme` block.
- Shadcn CSS variables go in a separate `@theme inline` block.
- Dark mode variant: `@custom-variant dark (&:is(.dark *))`
- Tailwind source scanning: `@source "../node_modules/@blocknote/shadcn"` (for rich editor).

### C3: PocketBase Singleton (HMR Safety)

`React.cache()` deduplicates within one render pass but does **not** survive Next.js HMR cycles. The admin client instance must be stored on `globalThis`:

```typescript
declare global {
  var __pbAdminClient: PocketBase | undefined
}

export const getAdminClient = cache(async (): Promise<PocketBase> => {
  if (globalThis.__pbAdminClient) return globalThis.__pbAdminClient
  const pb = new PocketBase(env.POCKETBASE_URL)
  pb.autoCancellation(false)
  await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD)
  globalThis.__pbAdminClient = pb
  return pb
})
```

### C4: DOMPurify — Server-Only

`isomorphic-dompurify` uses `jsdom` internally. Importing it in a client component bundles `jsdom` to the browser and fails. Enforcement:

- Create `lib/sanitize.ts` with `import 'server-only'` as the first line.
- Call `sanitizeHtml()` at **data-fetching time** in server components, never in rendering.
- Any client component import of `isomorphic-dompurify` (direct or transitive) is a build error.

### C5: App Boundaries

Every segment of the app must handle failure gracefully. Root-level boundaries:

| File | Purpose | Behavior |
|---|---|---|
| `app/error.tsx` | Catches all unhandled errors | "Something went wrong" + retry button |
| `app/not-found.tsx` | Catches unmatched routes | "Page not found" + back-to-home link |
| `app/loading.tsx` | Shown during server component streaming | Centered skeleton/spinner |

Per-segment boundaries (`blog/[slug]/error.tsx`, etc.) added in later phases as needed.

### C6: Auth Token Refresh

In `app/api/auth/me/route.ts`, after calling `authRefresh()`, **both** auth cookies must be updated:

```typescript
const response = NextResponse.json({ user, token: pb.authStore.token })

// Refresh pb_auth with the new session token
response.cookies.set('pb_auth', pb.authStore.token, {
  httpOnly: true, secure: true, sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 14, path: '/',
})

// Refresh pb_role so middleware sees role changes without re-login
response.cookies.set('pb_role', user.role, {
  httpOnly: true, secure: true, sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 14, path: '/',
})

return response
```

**Failure to refresh `pb_role`** was a V1 bug: admin role changes would not propagate to the middleware until the user logged out and back in.

---

## 4. Execution Phases (The Roadmap)

### Phase 0 — Scaffold & Setup

**Goal**: Clean Next.js 15 project with all dependencies installed and configured.

| Step | Action | Verification |
|---|---|---|
| 0.1 | Create `v2` branch from `main` | `git checkout -b v2` |
| 0.2 | Remove all V1 source files, keep `.git` | Only `.git` remains |
| 0.3 | `pnpm create next-app@15 .` | Scaffold answers: TS, Tailwind, App Router, no `src/`, no Turbopack |
| 0.4 | Delete demo boilerplate | Remove default page, favicon, globals.css, fonts |
| 0.5 | `pnpm add pocketbase react-markdown remark-gfm isomorphic-dompurify @blocknote/core @blocknote/react @blocknote/shadcn` | Runtime deps |
| 0.6 | `pnpm add -D @types/dompurify` | Type defs |
| 0.7 | `npx shadcn@latest init` | Answers: square radius, neutral, CSS vars, `@/`. Auto-detects TW v4 |
| 0.8 | Install shadcn base components | `npx shadcn@latest add button card input textarea dialog skeleton dropdown-menu table badge avatar separator` |
| 0.9 | Write `.env` from `.env.example` | All 7 vars populated |
| 0.10 | Write `next.config.ts` | remotePatterns for 42 CDN + PB, `experimental.viewTransition` |
| 0.11 | `pnpm lint` + `pnpm build` | Clean |

**Deliverables**: Healthy dev server at `localhost:3000`, shadcn components importable, PocketBase SDK importable.

---

### Phase 1 — Shared Foundation Layer

**Goal**: Types, env validation, constants, PocketBase singleton, DOMPurify wrapper.

| Step | File | Key Detail |
|---|---|---|
| 1.1 | `types/pocketbase.ts` | All interfaces. `PostRecord` centralized (was inline in V1). No `any`. |
| 1.2 | `lib/env.ts` | Lazy proxy, `'server-only'`, throws at runtime on missing var |
| 1.3 | `lib/constants.ts` | `ROLE_HIERARCHY`, `AUTHENTICATED_PREFIXES`, `NON_GUEST_PREFIXES`, `AUTH_ROUTES`, `XP_CATEGORIES`, `TIERS` |
| 1.4 | `lib/pocketbase-server.ts` | **C3**: `globalThis.__pbAdminClient` inside `React.cache()`. `getPocketBaseClient()` (unauthenticated). |
| 1.5 | `lib/sanitize.ts` | **C4**: `'server-only'`, wraps `isomorphic-dompurify` with allowed tags whitelist |

**No components yet**. This phase is purely data/types/infrastructure.

---

### Phase 2 — Auth Logic & Middleware

**Goal**: Server-side auth utilities and edge middleware for route gating.

| Step | File | Key Detail |
|---|---|---|
| 2.1 | `lib/auth.ts` | **C1**: `await cookies()`. `authenticate()`, `requireRole(minRole)`, `requireSuperPeer()`. Hierarchy from `lib/constants.ts`. |
| 2.2 | `middleware.ts` | **Default export**. `req.cookies` (sync). Three-rule gate from `lib/constants.ts`. Matcher excludes assets. |

**Verification**:
- `localhost:3000/dashboard` without auth → redirect to `/register?next=/dashboard`
- With `pb_role=guest` cookie → redirect to `/`
- `localhost:3000/register` with valid `pb_role=super_peer` → redirect to `/dashboard`

---

### Phase 3 — Auth API Routes & AuthProvider

**Goal**: Complete auth cycle — login, callback, logout, session check — plus client-side auth context.

| Step | File | Key Detail |
|---|---|---|
| 3.1 | `app/api/auth/login/route.ts` | Generate state, set `oauth_state` cookie (10min), redirect to 42 |
| 3.2 | `app/api/auth/callback/route.ts` | Validate state, exchange code, fetch Intra profile, upsert PB user, set `pb_auth` + `pb_role`, redirect |
| 3.3 | `app/api/auth/logout/route.ts` | Clear `pb_auth`, `pb_role`, `oauth_state` |
| 3.4 | `app/api/auth/me/route.ts` | **C6**: `await cookies()`, `authRefresh()`, return `{user, token}`. **Refresh both `pb_auth` and `pb_role` cookies.** |
| 3.5 | `lib/auth-context.tsx` | React Context + Provider. Single `fetch('/api/auth/me')` on mount. State: `{ user, token, isLoading, isAuthenticated, error }`. `logout()` method. |
| 3.6 | `components/shared/navbar.tsx` | Sticky nav shell consuming `useAuth()`. Register/Dashboard/Logout buttons. |

**Verification**:
- `curl /api/auth/me` no cookie → 401
- `curl /api/auth/me` valid cookie → 200 + `Set-Cookie: pb_role=...`
- `useAuth()` in any client component → populated from single API call
- Logout → state clears, cookies deleted

---

### Phase 4 — Design System & Shared UI

**Goal**: Full design token setup, app boundaries, universal components.

| Step | File | Key Detail |
|---|---|---|
| 4.1 | `app/globals.css` | **C2**: `@theme` with brand colors (OKLCH), fonts, animations, easing. `@theme inline` with shadcn vars. `:root` values mapped to ARGC palette. `@custom-variant dark`. Keyframes + View Transitions. |
| 4.2 | `app/layout.tsx` | Font loading, `<AuthProvider>`, `<Navbar>`, `<main>{children}</main>` |
| 4.3 | `app/error.tsx` | **C5**: `"use client"`, error + retry |
| 4.4 | `app/not-found.tsx` | **C5**: 404 message + home link |
| 4.5 | `app/loading.tsx` | **C5**: centered skeleton |
| 4.6 | `components/shared/empty-state.tsx` | Props: `icon`, `title`, `description`, `action?` |
| 4.7 | `components/shared/loading-skeleton.tsx` | Variants: card, row, detail |
| 4.8 | `components/shared/error-fallback.tsx` | Props: `error`, `reset` |

**Deliverable**: App boots with full design system, handles errors gracefully, all shared components importable.

---

### Phase 5 — Public Interfaces

**Goal**: All public-facing pages — landing, blog, events, handbook, registration.

| Component Group | Files | Data Source |
|---|---|---|
| **Landing** | `hero`, `ascii-canvas`, `ascii-ruler`, `section-vision`, `section-about`, `section-contact` | Static — port from V1 |
| **Blog** | `blog-card`, `blog-grid`, `blog-submit-form`, `rich-editor`, `tag-input` + pages + API routes | PocketBase `posts` |
| **Events** | `event-list`, `event-row` + pages + API routes | PocketBase `events` (dynamic — **no hardcoded data**) |
| **Handbook** | `handbook-index`, `handbook-topic` + pages + `lib/api/github.ts` | GitHub API (`argc-handbook` repo) + ISR |
| **Registration** | `login-gate`, `identity-panel` + page + API route | PocketBase `submissions` |

**Key difference from V1**: Events page fetches from PocketBase `events` collection instead of hardcoded array. Blog content sanitized with `lib/sanitize.ts` before rendering.

**Verification**:
- Blog index loads published posts from PB
- Blog post renders sanitized HTML (no `dangerouslySetInnerHTML` without DOMPurify)
- Events page shows dynamic data from PB `events` collection
- Handbook renders GitHub-sourced markdown with 1-hour ISR
- Registration form submits to PB `submissions`

---

### Phase 6 — Dashboard & Mutations

**Goal**: Complete admin dashboard with role-gated CRUD operations.

| Component Group | Files | Auth Gate |
|---|---|---|
| **Dashboard Shell** | `dashboard-shell`, `dashboard-sidebar` | All non-guest roles |
| **Admin Overview** | `stat-cards` + page + API route | `super_peer`+ |
| **Members** | `member-table`, `member-detail` + pages + API routes | `super_peer`+ |
| **Nodes** | `node-card` + page + API routes | `super_peer`+ |
| **Events** | (dashboard view of events) + API routes | `super_peer`+ |
| **Votes** | `vote-row` + page + API route | `super_peer`+ |
| **Cycles** | `cycle-card` + page + API routes | `super_admin_peer` for mutations |
| **Endorsements** | `endorsement-row` + page + API routes | `super_peer`+ |
| **XP Award** | `xp-ledger-table` + form + API route | `super_admin_peer` |

**Key differences from V1**:
- **No dead sidebar links** — every nav item resolves to a real page
- **All mutations via API routes** with `requireSuperPeer()` enforcement (not just UI hiding)
- **Error boundaries** per segment, not one generic boundary for the whole dashboard
- **Empty states** use the universal `<EmptyState />` component
- **Loading states** use skeleton components, not full-page blocking

**Verification**:
- Sidebar shows only items matching user role
- Member role changes require `super_admin_peer` + confirmation dialog
- XP award requires `super_admin_peer`, validated on server
- Endorsement verification auto-awards 25 XP
- Empty states render for each data section when no records exist

---

## 5. Migration from V1 — Key Changes Reference

| V1 (Problem) | V2 (Fix) | Phase |
|---|---|---|
| `proxy.ts` named export (not registered) | `middleware.ts` default export (standard Next.js 15) | 2 |
| No auth context — N+1 `/api/auth/me` calls | `<AuthProvider>` — single fetch on mount | 3 |
| `pb_role` cookie stale after role change | Refreshed on every `/api/auth/me` call | 3 |
| No `tailwind.config.ts` for v3 → no migration needed for v4 | `@theme` + `@theme inline` in `globals.css` | 4 |
| `dangerouslySetInnerHTML` without sanitization | `lib/sanitize.ts` — DOMPurify at fetch time | 5 |
| Events page hardcoded (disconnected from PB) | Events page fetches from PB `events` collection | 5 |
| Dashboard sidebar links to non-existent routes | All sidebar links resolve to real pages | 6 |
| `PostRecord` type defined inline in API route | Centralized in `types/pocketbase.ts` | 1 |
| `SectionPurpose.tsx` dead code (duplicate of `SectionAbout`) | Not ported — single `section-about` component | 5 |
| `SectionRegister.tsx` mock form (dead code) | Not ported — real form in `app/register/page.tsx` | 5 |
| `lib/pocketbase-client.ts` never used | Not ported — server-only pattern eliminates need | — |
| PB client connection leak in HMR | `globalThis.__pbAdminClient` singleton | 1 |
| Dashbaord auth check duplicated in layout + page | Layout gated by middleware; page-only redirects | 6 |

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| 42 OAuth flow breaks in production if redirect URIs mismatch | Low | High | Verify `FORTYTWO_REDIRECT_URI` matches 42 Intra app config in Phase 3 testing | Auth |
| PocketBase Railway instance goes down | Low | High | Add connection timeout + retry in `getAdminClient()`. Show degraded UI, not crash | Backend |
| Handbook GitHub API rate limiting (60 req/hr unauthenticated) | Medium | Medium | Cache aggressively. Fall back to build-time static content. Add auth token for higher limits if needed | Handbook |
| Shadcn v4 init compatibility with Tailwind v4 | Low | Medium | Pin `shadcn@latest` version. If auto-detect fails, use `--tailwind-v4` flag explicitly | Scaffold |
| BlockNote rich editor conflicts with shadcn theming | Low | Medium | Wrap in isolated CSS scope. Test integration before Phase 5 | Blog |
| Migration from V1 PB schema changes | Low | High | PB collections already migrated. `scripts/setup-collections.mjs` documents required schema | Backend |

---

## 7. Definition of Done

A phase is complete when:

1. All files listed in the phase exist and compile without TypeScript errors.
2. All verification tests in the phase pass.
3. `pnpm lint` passes with zero warnings (exceptions documented).
4. `pnpm build` produces a clean production build.
5. No `any` types, no `// @ts-ignore`, no `eslint-disable` without a committed reason.
6. All API routes that handle mutations enforce role checks server-side (not just UI).
7. All user-facing text has empty states, loading states, and error boundaries.

---

*Document generated: 2026-07-28. Last reviewed: —*
*This is a living document — update as architectural decisions evolve.*
