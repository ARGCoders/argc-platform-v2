# Component inventory

**Read this before writing a new component.** Most of what a page needs already exists,
themed and accessibility-checked. Several of these are currently unused — they were built
for pages that are being redesigned, not abandoned.

Surfaces referenced below:

- **paper** — the light page background (`--background`)
- **navy** — `eng-navy`, used for the dashboard and mobile menu
- **maroon** — `argc-maroon`, the hero and registration background

---

## In use

| Component          | File                                                | Notes                                                                                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Navbar`           | `components/shared/navbar.tsx`                      | Sticky, scroll-aware, mobile hamburger with scroll lock and a profile dropdown. Links come from `content/site.json`. Reads auth from `useAuth()` — do not add another session fetch. `maroon` variant on `/events` and `/register`.                                                              |
| `Hero`             | `components/features/landing/hero.tsx`              | Full-viewport maroon hero. Copy from `content/landing.json`.                                                                                                                                                                                                                                     |
| `AsciiCanvas`      | `components/features/landing/ascii-canvas.tsx`      | 24fps ASCII animation. Fetches `public/ascii/frames.txt`; **never import the frames as a module** — that cost 18.4 MB of JavaScript in V1. Respects reduced motion, pauses on tab-blur and off-screen.                                                                                           |
| `VoteCastForm`     | `components/features/vote/vote-cast-form.tsx`       | Member-facing vote casting (MEMBER-12). Props: `eligible`, `myVotes`, `onCast`. Confirmation step before submit; reason bounded client-side to the same 10–500 the POST route enforces; spent polarity disabled; maps a `conflict` cast result to user-safe copy. Copy from `content/vote.json`. |
| `DashboardShell`   | `components/shared/dashboard/dashboard-shell.tsx`   | Navy layout wrapper rendered by `app/dashboard/layout.tsx` for every `/dashboard` route. Sidebar rail + scrollable content column; `pt-nav` clears the fixed public Navbar.                                                                                                                      |
| `DashboardSidebar` | `components/shared/dashboard/dashboard-sidebar.tsx` | Rendered unconditionally inside `DashboardShell`. Role-filtered nav, mobile takeover menu; renders `Avatar` + `RoleBadge` for the signed-in user.                                                                                                                                                |
| `DashboardHeader`  | `components/shared/dashboard/dashboard-header.tsx`  | `title`, `crumbs?`, `actions?`. Used directly by `app/dashboard/page.tsx` and `app/dashboard/overview/page.tsx` (both still placeholder content, but the header itself is live).                                                                                                                 |
| `Avatar`           | `components/shared/avatar.tsx`                      | `src`, `name`, `size?`, `surface?`. Not just dev-preview scaffolding — `DashboardSidebar` renders it for every signed-in dashboard visitor. Distinct from the shadcn `avatar` primitive in `components/ui/`.                                                                                     |
| `RoleBadge`        | `components/shared/dashboard/role-badge.tsx`        | `role: Role`. Rendered alongside `Avatar` in `DashboardSidebar`'s identity block — reachable now, not only via the dev preview.                                                                                                                                                                  |

---

## Available, currently unused

### Shared

| Component                            | File                                                   | Props / behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Field`, `FieldArea`, `FieldWrapper` | `components/shared/field.tsx`                          | Labelled input and textarea. `surface: 'dark' \| 'light'`. Ids come from `useId()`; error text is wired to `aria-describedby` and borders meet the 3:1 non-text contrast rule.                                                                                                                                                                                                                                                                                                                                                 |
| `EmptyState`                         | `components/shared/empty-state.tsx`                    | `title`, `description?`, `icon?`, `action?`. Use this for every "no records" case rather than writing prose inline.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Spinner`                            | `components/shared/spinner.tsx`                        | `size: 'sm' \| 'md' \| 'lg'`, `label` for screen readers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ErrorFallback`                      | `components/shared/error-fallback.tsx`                 | Body for every `error.tsx`. Shows the raw message only in development; surfaces `digest` in production.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Breadcrumb`                         | `components/shared/breadcrumb.tsx`                     | `items: { label, href? }[]`. The final crumb renders as text with `aria-current="page"`.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Skeletons                            | `components/shared/loading-skeleton.tsx`               | `CardSkeleton`, `CardGridSkeleton`, `RowSkeleton`, `RowListSkeleton`, `DetailSkeleton`. Shaped to match real layouts so loading does not shift content.                                                                                                                                                                                                                                                                                                                                                                        |
| `BannerPlaceholder`                  | `components/shared/banner-placeholder.tsx`             | Deterministic gradient from a `seed` string, for records with no image.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `TierBadge`                          | `components/shared/dashboard/tier-badge.tsx`           | `tier: Tier`. 4-segment tick bar (gray → Steel Blue → Signal Amber → Alert Coral), deliberately a different construction from `RoleBadge` so rank and tier read as different facts. Real path — `TASKS_BACKLOG.md`'s UI-07 and MEMBER-07 assumed `components/shared/xp/tier-badge.tsx`; that path was never used.                                                                                                                                                                                                              |
| `EvaluationStageRow`                 | `components/shared/dashboard/evaluation-stage-row.tsx` | `stage`, `status`, `evaluatorName`, `scheduledAt`, `score`, `surface?`. Read-only Bordered Rows template (fixed 46px height, `border-b` only, per-field `aria-label`). Promoted to `shared/` under `DASHBOARD_CONTRACT.md` §3's "two or more features need it" rule — the member's own evaluation history, the node leader's schedule view, and the super peer's pipeline view all consume it. Supersedes `TASKS_BACKLOG.md` MEMBER-13's assumed `components/features/evaluations/evaluation-stage-row.tsx`.                   |
| `NodeMemberRow`                      | `components/shared/dashboard/node-member-row.tsx`      | `name`, `avatarUrl`, `tier`, `xp`, `evaluationStages`, `href?`, `surface?`. Same Bordered Rows template; optional `href` turns the row into a link with hover/focus states, absent it stays fully static. Promoted to `shared/` under `DASHBOARD_CONTRACT.md` §3's "two or more features need it" rule — the member's own node roster, the node leader's member table, and the super peer's member directory all consume it. Supersedes `TASKS_BACKLOG.md` MEMBER-10's assumed `components/features/node/node-member-row.tsx`. |
| `RoleGate`                           | `components/shared/dashboard/role-gate.tsx`            | `minRole`, `children`, `fallback?`. Not rendered anywhere in the real component tree — `DashboardShell`/`Sidebar`/`Header` never use it. Only exercised today in the dev preview route's demo blocks.                                                                                                                                                                                                                                                                                                                          |
| `StatusChip`                         | `components/shared/dashboard/status-chip.tsx`          | `domain`, `status`, `surface?`. Consumed by `EvaluationStageRow`, which itself isn't wired into any real page yet — reachable only via the dev preview.                                                                                                                                                                                                                                                                                                                                                                        |

### shadcn primitives

`components/ui/` — `button`, `card`, `input`, `textarea`, `dialog`, `skeleton`,
`dropdown-menu`, `table`, `badge`, `avatar`, `separator`.

Rethemed to the ARGC palette: square corners (`--radius: 0`), maroon primary, cool
neutrals. They are generated files — prefer composing them over editing them, and re-add
others with `npx shadcn@latest add <name>` rather than hand-writing a primitive.

---

## Library modules

| Module                     | Purpose                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth.ts`              | `authenticate()`, `requireRole()`, `requireSuperPeer()`, `requireSuperAdminPeer()`, and `AuthError` carrying a 401/403 status. Use `authErrorResponse()` in route handlers so internal errors do not leak. |
| `lib/auth-context.tsx`     | `AuthProvider` + `useAuth()`. One `/api/auth/me` call per page load — components must not fetch it themselves.                                                                                             |
| `lib/sanitize.ts`          | `sanitizeHtml()` and `stripHtml()`. Call at fetch time, never during render. Covered by `lib/sanitize.test.ts`.                                                                                            |
| `lib/constants.ts`         | Role hierarchy, `roleAtLeast()`, route prefixes, `isSafeRedirect()`, XP categories, tiers, cookie names.                                                                                                   |
| `lib/content.ts`           | Typed accessors for `content/*.json`. Import from here, never the JSON directly.                                                                                                                           |
| `lib/cookies.ts`           | Shared auth cookie options so they cannot drift between routes.                                                                                                                                            |
| `lib/pocketbase-server.ts` | `getAdminClient()` (cached + HMR-safe) and `getPocketBaseClient()`.                                                                                                                                        |
| `lib/xp.ts`                | `awardXp()` — the single ledger-write path for XP (idempotent, keeps `user_stats` in sync). Every XP award goes through it. See ARCHITECTURE.md. Covered by `lib/xp.test.ts`.                              |
| `lib/api/42-api.ts`        | 42 Intra OAuth URL, code exchange, profile fetch.                                                                                                                                                          |

---

## Adding a component

1. Check this file first.
2. One feature → `components/features/<domain>/`. Used by two or more → `components/shared/` (ownership: see `docs/DASHBOARD_CONTRACT.md` §3).
3. Style with tokens (`bg-paper`, `text-ink-muted`, `border-input`), never raw hex.
4. Server component by default; add `'use client'` only when you need state or an effect.
5. Colocate a `*.test.tsx` and render it through `test/render.tsx`.
6. Add a row here.
