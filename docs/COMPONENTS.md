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

| Component     | File                                           | Notes                                                                                                                                                                                                                               |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Navbar`      | `components/shared/navbar.tsx`                 | Sticky, scroll-aware, mobile hamburger with scroll lock and a profile dropdown. Links come from `content/site.json`. Reads auth from `useAuth()` — do not add another session fetch. `maroon` variant on `/events` and `/register`. |
| `Hero`        | `components/features/landing/hero.tsx`         | Full-viewport maroon hero. Copy from `content/landing.json`.                                                                                                                                                                        |
| `AsciiCanvas` | `components/features/landing/ascii-canvas.tsx` | 24fps ASCII animation. Fetches `public/ascii/frames.txt`; **never import the frames as a module** — that cost 18.4 MB of JavaScript in V1. Respects reduced motion, pauses on tab-blur and off-screen.                              |

---

## Available, currently unused

### Shared

| Component                            | File                                       | Props / behaviour                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Field`, `FieldArea`, `FieldWrapper` | `components/shared/field.tsx`              | Labelled input and textarea. `surface: 'dark' \| 'light'`. Ids come from `useId()`; error text is wired to `aria-describedby` and borders meet the 3:1 non-text contrast rule. |
| `EmptyState`                         | `components/shared/empty-state.tsx`        | `title`, `description?`, `icon?`, `action?`. Use this for every "no records" case rather than writing prose inline.                                                            |
| `Spinner`                            | `components/shared/spinner.tsx`            | `size: 'sm' \| 'md' \| 'lg'`, `label` for screen readers.                                                                                                                      |
| `ErrorFallback`                      | `components/shared/error-fallback.tsx`     | Body for every `error.tsx`. Shows the raw message only in development; surfaces `digest` in production.                                                                        |
| `Breadcrumb`                         | `components/shared/breadcrumb.tsx`         | `items: { label, href? }[]`. The final crumb renders as text with `aria-current="page"`.                                                                                       |
| Skeletons                            | `components/shared/loading-skeleton.tsx`   | `CardSkeleton`, `CardGridSkeleton`, `RowSkeleton`, `RowListSkeleton`, `DetailSkeleton`. Shaped to match real layouts so loading does not shift content.                        |
| `BannerPlaceholder`                  | `components/shared/banner-placeholder.tsx` | Deterministic gradient from a `seed` string, for records with no image.                                                                                                        |

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
| `lib/api/42-api.ts`        | 42 Intra OAuth URL, code exchange, profile fetch.                                                                                                                                                          |

---

## Adding a component

1. Check this file first.
2. One feature → `components/features/<domain>/`. Used by two or more → `components/shared/`.
3. Style with tokens (`bg-paper`, `text-ink-muted`, `border-input`), never raw hex.
4. Server component by default; add `'use client'` only when you need state or an effect.
5. Colocate a `*.test.tsx` and render it through `test/render.tsx`.
6. Add a row here.
