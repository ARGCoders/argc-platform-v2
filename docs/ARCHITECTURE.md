# Architecture

How this repo is organised, and the rules that are easy to break by accident.

## Folder layout

```
app/                     Routes only — a file here is a page, layout, route handler
                         or boundary. Components live in components/.
  api/                   Route handlers
  globals.css            The entire design system
components/
  ui/                    shadcn primitives (generated — edit sparingly)
  shared/                Cross-feature components
  features/<domain>/     Components owned by one feature
lib/                     Server and client utilities
  api/                   Outbound HTTP clients (42 Intra, GitHub)
content/                 Editable copy as JSON
types/                   Shared TypeScript types
test/                    Test helpers, not tests
scripts/                 One-off and setup scripts
docs/                    This file and the planning documents
proxy.ts                 Route gating (see below)
```

Imports always use the `@/` alias, never `../../..`.

## Rules

### Copy lives in `content/*.json`

No user-facing string is hardcoded in a component. `content/site.json` holds navigation
and metadata; `content/landing.json` holds page copy. `lib/content.ts` types them against
`types/content.ts`, so a malformed edit fails `pnpm build` instead of shipping.

Multi-line headlines are arrays — one entry per rendered line — which keeps markup out of
the JSON.

### The design system is `app/globals.css`

Tailwind v4 has no config file. Brand tokens are in a `@theme static` block; shadcn's
semantic variables are remapped onto them in `:root` and `.dark`.

**`static` is not optional.** A plain `@theme` block is tree-shaken: Tailwind only emits
variables that a generated utility references, so a token read through `var()` from an
inline style or from third-party CSS resolves to nothing. Measured: 8 of 15 tokens were
absent at runtime without it.

Two colour variables that look redundant are not:

- `--border` is decorative — card outlines, row dividers.
- `--input` is the boundary that identifies a form control, which WCAG 2.1 SC 1.4.11
  requires to reach 3:1 against its background. Measured 3.74:1 on paper, 3.32:1 on stone.

### `proxy.ts`, not `middleware.ts`

Next.js 16 renamed the `middleware` file convention to `proxy` and deprecated the old
name and export. The runtime is Node.js and cannot be configured — setting `runtime` in
this file throws.

Proxy gating reads cookies, which a client controls. It is a redirect convenience, **not
an authorization control**. Every API route re-checks the role server-side with
`requireRole()` from `lib/auth.ts`.

### The server-only boundary

`lib/{auth,env,pocketbase-server,sanitize}.ts` begin with `import 'server-only'`. Importing
any of them from a client component is a build error, which is the point:
`isomorphic-dompurify` pulls in jsdom, and the PocketBase admin client holds superuser
credentials.

Under Vitest this would break every test that touches them, so `vitest.config.mts` aliases
`server-only` to an empty stub. That alias is scoped to the test runner; the real guard
still applies to the build.

### Async request APIs

`cookies()`, `headers()`, route `params` and `searchParams` are Promises and must be
awaited. `req.cookies` inside `proxy.ts` is the exception — it is synchronous.

### PocketBase access

The frontend never calls PocketBase directly. Server code uses `getAdminClient()` from
`lib/pocketbase-server.ts`, which is cached two ways on purpose: `React.cache()`
deduplicates within a render pass, and a `globalThis` singleton survives HMR. Without the
second, every hot reload leaked an authenticated connection.

Never interpolate a value into a filter string. Use the SDK's parameterised form:

```ts
admin.filter('slug = {:slug}', { slug })
```

### Schema is code

`scripts/setup-collections.mjs` is the source of truth for the PocketBase schema. It is
idempotent — run it as often as you like. If you add a collection or a field, add it there
and to `types/pocketbase.ts` in the same commit.

### XP is only ever written through `awardXp`

Every XP award — vote received, evaluation completed, event organized, endorsement
verified, manual adjustment — goes through `awardXp()` from `lib/xp.ts`. Never create an
`xp_ledger` row directly from a route handler.

The contract (frozen in INFRA-06, argument order included):

```ts
awardXp(user, amount, category, referenceId, referenceType, cycle, awardedBy?)
// user, referenceId, cycle: record ids
// amount: non-zero; negative only for corrections
// category: an XpCategory; amount is decided by the caller, usually XP_WEIGHTS[category]
// awardedBy: the awarding super peer's id; null for self-verifying events
```

It returns `{ created, ledger, stats }`. What it guarantees:

- **Idempotency** — a second call with the same `(user, referenceId)` is a no-op
  (`created: false`); it never double-awards. Reference the source record (vote id,
  evaluation id, ...) so a retried request cannot double-pay.
- **`user_stats` sync** — `xp_total` is incremented, the tier recomputed from
  `TIER_THRESHOLDS`, and the counter matching the category is bumped via `XP_STATS_BUMPS`
  (PLATFORM.md §5's "increment in the same request" option).
- **Validation** — a non-zero finite amount, known category/reference type and non-empty
  ids, or it throws `XpError` before touching the database.

For cycle-close reconciliation, ADMIN-08's recompute rebuilds `user_stats` from the
ledger — the recovery path if inline updates ever diverge. The ledger stays append-only;
a wrong award is corrected with a negative `manual_adjustment`, never by editing a row.

## Testing

Vitest with jsdom. Tests are colocated as `*.test.ts(x)` next to the code they cover.

Component tests use `renderWithProviders` from `test/render.tsx`, which wraps the tree in
the **real** `AuthProvider` with `fetch` stubbed rather than injecting a fake context —
that way a provider regression cannot pass unnoticed. Because the provider resolves its
session asynchronously, use `findBy*` for anything depending on signed-in state.

A test that cannot fail is not a test. When adding a guard, verify it reddens by
temporarily breaking the code it protects.

## Corrections to the carried-over docs

The V1 planning documents were written before this repo existed and three of their
technical claims are wrong. `V2_MASTER_PLAN.md` and `SYSTEM_ARCHITECTURE.md` have been
deleted for that reason — they are in git history if ever needed. `PLATFORM.md` is kept,
because it is the only record of the dashboard product spec, but its "Preliminary Notes"
repeat the `proxy.ts` error below.

The corrections are recorded here so the decisions are not re-opened:

| Claim                                                                | Reality                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pin Next.js 15, "not 16"                                             | The stack is Next 16. C1 (async request APIs) still applies.                                                                                                                                                 |
| `proxy.ts` is a bug; rename to `middleware.ts` with a default export | Backwards. `proxy` is the Next 16 convention; `middleware` is deprecated. Verified registered — the build reports `Proxy (Middleware)` and all three redirect rules were exercised against a running server. |
| `pb_role` goes stale after a role change                             | V1's `/api/auth/me` already re-set it. The bug did not exist.                                                                                                                                                |

One more, for the record: the master plan's session-cookie snippet hard-coded
`secure: true`, which makes the browser drop every auth cookie on `http://localhost` and
breaks the whole flow in development. `lib/cookies.ts` makes it conditional on
`NODE_ENV`.
