# Dashboard team contract

**Read this before implementing anything under `/dashboard` or `/api/dashboard` /
`/api/admin`.** It is the single source of truth for how Roles 3 and 4 build the
dashboard, so that nobody has to ask the team how a route or a page is supposed to
behave. If something is genuinely unspecified, raise it in the issue — do not invent
a convention.

Authoritative companions:

- `docs/PLATFORM.md` §4 — the full route map (roles, reads, writes per route).
- `docs/PLATFORM.md` §5 — data flow: XP, vote anonymization, cycle process, endorsements.
- `docs/ARCHITECTURE.md` — repo layout, proxy rules, PocketBase access, **XP write rules**.
- `docs/COMPONENTS.md` — component inventory and the ownership map below.

## 1. API response shape

Every route handler under `/api/` responds with one of two envelopes. There is no
third shape — no bare arrays, no top-level strings.

### Success

```json
{ "data": {} }
```

`GET` list endpoints add pagination fields. `page` is 1-based; `perPage` defaults to
20 and caps at 100. Query params are `page`, `perPage`, and the route's own filters
(e.g. `cycle`, `node`, `tier`, `role`, `search`).

```json
{
  "data": [],
  "page": 1,
  "perPage": 20,
  "totalItems": 57,
  "totalPages": 3
}
```

`POST` / `PATCH` return the created or updated record under `data` with status 201 / 200. A mutation that changed nothing (idempotent retry, no-op RSVP) returns the
existing record with 200 — never an error.

### Errors

```json
{ "error": { "code": "not_found", "message": "Evaluation not found" } }
```

| HTTP status | `code`          | When                                                            |
| ----------- | --------------- | --------------------------------------------------------------- |
| 400         | `invalid_input` | Malformed body, bad query param, validation failure             |
| 401         | `unauthorized`  | No session or session expired                                   |
| 403         | `forbidden`     | Authenticated but role too low for the route                    |
| 404         | `not_found`     | Record does not exist (or does not exist **for this caller**)   |
| 409         | `conflict`      | State conflict: duplicate RSVP, vote budget spent, cycle closed |
| 500         | `internal`      | Anything else — `details` is never sent to the client           |

Auth failures are produced by `lib/auth.ts`:

```ts
const { status, error } = authErrorResponse(err)
return NextResponse.json({ error: { code: <status === 401 ? 'unauthorized' : 'forbidden'>, message: error } }, { status })
```

Messages are user-safe by construction (`AuthError` messages are already client-safe).
For domain errors, throw a typed error and map it in a `catch` — the raw PocketBase
error text must never reach the response.

## 2. Error handling

### Route handlers

- Auth is the **first** thing in every protected handler:
  `const { user, token } = await requireRole('node_peer')` — replace the role with the
  route's minimum (M/NL/SP/SA per PLATFORM §4).
- Wrap the handler body in `try/catch`; map errors with `authErrorResponse()` for auth
  errors and explicit status codes for domain errors. `console.error` the unexpected
  ones, return `500`/`internal`.
- Validation errors list the offending field in `message` (e.g. `"score must be a
number 0–100"`) — no per-field `details` structure is required until a route needs one.
- Read-only routes never write; write routes never read the ledger except through
  `lib/xp.ts` (see §4).

### Pages

- Every dashboard segment gets `app/dashboard/<segment>/error.tsx` + `loading.tsx`
  rendering `ErrorFallback` and the shared `Skeletons` from `components/shared/`.
- Every "no records" case renders `EmptyState` — never prose inline.
- Client components never fetch auth themselves: `useAuth()` from
  `lib/auth-context.tsx` is the only session source (one `/api/auth/me` per page load).
- Dashboard pages are server components by default; `'use client'` only where state or
  an effect is needed. Fetch API data with `cache: 'no-store'` — these routes are
  session- and role-dependent and must never be statically cached.

## 3. Component ownership map

| Owner  | Owns                                                                          | May add to                                                                                   |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Role 2 | All of `components/shared/`, `components/ui/`, `content/*.json`, public pages | —                                                                                            |
| Role 3 | Feature components for member/node views                                      | `components/features/node/`, `components/features/vote/`, `components/features/evaluations/` |
| Role 4 | Feature components for admin views                                            | `components/features/admin/`                                                                 |

Rules:

- **Two or more features need it → `components/shared/`** (Role 2 owns it, but Roles
  3/4 may propose additions — file a row in `COMPONENTS.md` in the same PR).
- **One feature needs it → `components/features/<domain>/`** next to its first use.
- **Never page-local components** — a component used only by one page still lives in
  `components/features/<domain>/`, not inside `app/`.
- shadcn primitives go in `components/ui/` **only** via `npx shadcn@latest add <name>`
  — never hand-written, and never edited beyond the ARGC retheme.
- Role 3/4 pages compose Role 2 shared components (XpBar, StatusChip, TierBadge,
  StatCard, XpLedgerTable, CycleSelector, ...) — do not re-implement them locally.

## 4. Ledger write rules

XP is written **only** through `awardXp()` from `lib/xp.ts` (contract frozen in
INFRA-06). Summary of the rules Roles 3/4 must follow:

- **One award per source record.** `referenceId` is the id of the record that caused
  the award (vote id, evaluation id, endorsement id, attendance id, manual note id).
  `awardXp` is idempotent on `(user, referenceId)` — a retried request cannot double-pay.
- **Amount from `XP_WEIGHTS`** unless the route has a reason to differ (manual awards
  type an amount; corrections use negative amounts with category `manual_adjustment`).
- **`user_stats` is synced by `awardXp`** — routes never touch `user_stats` directly.
- **The ledger is append-only.** A wrong award is corrected with a negative
  `manual_adjustment` entry, never by editing or deleting a ledger row.
- **The recompute route (ADMIN-01) is the reconciliation path** at cycle close; inline
  sync via `awardXp` is the day-to-day path. Dashboard pages never recalculate XP from
  the ledger — they read `user_stats`.

## 5. Route and page conventions

- File layout mirrors the URL: `app/api/dashboard/node/evaluations/[id]/route.ts`
  serves `/api/dashboard/node/evaluations/:id`. Admin-only routes live under
  `app/api/admin/`.
- Role gates: M = `requireRole('node_peer')`, NL = `requireRole('node_leader')`,
  SP = `requireSuperPeer()`, SA = `requireSuperAdminPeer()`.
- `proxy.ts` gating is a redirect convenience for logged-in users, **not** the
  authorization boundary — every route re-checks server-side.
- PocketBase queries use `getAdminClient()` and the SDK's parameterised filter form
  (`admin.filter('node = {:node}', { node })`) — never string interpolation.
- User-supplied rich content (event descriptions, endorsement messages) is run through
  `sanitizeHtml()` from `lib/sanitize.ts` at fetch time, never during render.
- Pages consume the same `/api/...` routes the UI calls — a page never queries
  PocketBase itself.

## 6. Public routes

The only public routes are `/endorse/[token]` (GET validates the token and returns the
subject's display name; POST creates/updates the endorsement) and `/api/public/*`
used by the public `/events` page (UI-15). They use the same envelopes; the token is
the only credential, validated against the `endorsements` collection. The `votes`
collection stays fully server-side — aggregated counts only for members, full records
only via SP routes (PLATFORM §5 "Vote Anonymization").
