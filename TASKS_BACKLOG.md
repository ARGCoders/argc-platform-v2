# TASKS_BACKLOG — ARGC Platform V2 Rebuild

> Complete work breakdown structure (WBS). One backlog per role, one entry per GitHub issue, with exact files, routes, dependencies and Definition of Done. If a task is ambiguous after reading this file, **do not guess** — ask in the issue before starting.

## Project Overview

| Field          | Value                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Project**    | ARGC Platform V2 — member portal & advancement system                                                                              |
| **Repository** | `ARGCoders/argc-platform-v2`                                                                                                       |
| **Deadline**   | **Aug 16, 2026 → Sep 15, 2026** (4 weeks)                                                                                          |
| **Team**       | Role 1 — Infra (Ayham) · Role 2 — Frontend/Landing · Role 3 — Dashboard core (member/node) · Role 4 — Dashboard admin (super peer) |
| **Tracking**   | GitHub Issues (#4–#52) + milestones (Week 1–4) + this backlog                                                                      |

### Tech Stack

- **Next.js 16** (App Router) — frontend + proxy backend
- **Tailwind CSS v4** + **shadcn/ui** primitives (`components/ui/`)
- **PocketBase** on Railway (`https://pocketbase-production-59e1.up.railway.app`) — data + auth
- **TypeScript**, **Vitest** (unit), **Playwright** (E2E, INFRA-08)
- **gh CLI / GitHub Projects** for the board; **Conventional Commits** with commitlint (subject ≤ **72 chars**)

### Non-negotiable standards (apply to EVERY task)

1. **`make check` must pass** (prettier --check . && eslint && tsc --noEmit && vitest run && next build) before any commit.
2. **Conventional Commits**, imperative mood, ≤ 72 chars: `feat(scope): verb ...`, `fix(api): ...`, `docs(...)`, `test(...)`, `chore(...)`.
3. **No direct DB schema edits** via Admin UI or ad-hoc scripts. Schema/access rules only through `scripts/setup-collections.mjs` (run `make db-setup`). Seed data only through `scripts/seed-dev.mjs` (`pnpm db:seed` / `make db-seed`).
4. **All client → PocketBase traffic must go through the Next.js proxy** (`proxy.ts` + `app/api/*` route handlers). The frontend never calls PocketBase URLs directly.
5. **Every XP write goes through `lib/xp.ts` → `awardXp(...)`**. No direct `xp_ledger`/`user_stats` writes anywhere else (see ARCHITECTURE.md "XP is only ever written through awardXp").
6. **Server-side `requireRole(...)` is the authorization boundary**; `proxy.ts` cookie gating is coarse UX only.
7. **No hardcoded strings in UI** — copy lives in `content/*.json`; components are props-driven.
8. **Tests are colocated** (`*.test.ts(x)`) unless noted; every component/route ships with its test.
9. Work in **stacked branches** off the previous PR's branch; every task ends in a PR (base = previous branch), with the issue commented and kept open until merge.

---

## Dependency Graph & Critical Path

```
WEEK 1 (FOUNDATIONS)                    WEEK 2 (READS & SHELL)              WEEK 3 (WRITES & LOGIC)           WEEK 4 (INTEGRATION & QA)
──────────────────────────              ──────────────────────────           ───────────────────────────        ──────────────────────────
INFRA-01 (#4) ── DONE ─┐                INFRA-09 (#12)  (contracts)          INFRA-05 (#8) ── DONE             INFRA-08 (#11)  E2E harness
INFRA-02 (#5) ── DONE ─┤                INFRA-07 (#10)  [EXTERNAL:           INFRA-06 (#9) ── DONE ────────┐  (blocked by ADMIN-01, ADMIN-08,
INFRA-03 (#6) ── DONE ─┤                Railway access]                      │                              │   INFRA-03) ── end of chain
INFRA-04 (#7) ── DONE ─┤                │                                    │                              │
INFRA-06 (#9) ── DONE ─┼──▶ all reads/writes depend on these                │                              │
                      │                  UI-02..UI-13 (#14-#25)              ▼                              ▼
UI-01 (#13)   landing  │                  │ (shell/sidebar/header/          MEMBER-09 (#34)  evals           ADMIN-01 (#40) recompute
UI-06 (#18)   XpBar ───┤                  │  role-gate/badges/chips/        MEMBER-12 (#37) votes           ADMIN-05 (#44) eval admin
UI-07 (#19)   TierBadge                   │  statcard/ledger/cycle)          MEMBER-14 (#39) events          ADMIN-07 (#46) event award
UI-08 (#20)   RoleBadge                   │                                  ADMIN-02 (#41) xp award        ADMIN-11 (#50) role change
UI-09 (#21)   StatusChip                  ▼                                  ADMIN-06 (#45) votes admin      ADMIN-08 (#47) endorsements
                          MEMBER-01 (#26) me/stats                          ADMIN-10 (#49) cycles          UI-15 (#52) public /events
                          MEMBER-02 (#27) me/xp                             │                               ADMIN-09 (#48) nodes admin
                          MEMBER-07 (#32) node/me                           ▼
                          ADMIN-03 (#42) members API                        MEMBER-03 (#28) overview
                          ADMIN-09 (#48) nodes admin                        MEMBER-04 (#29) xp page
                          ADMIN-04 (#43) admin pages                        MEMBER-05 (#30) events API
                          └─▶ pages in W2 are reads only                    MEMBER-06 (#31) events page
                                                                             MEMBER-08 (#33) node page
                                                                             MEMBER-10 (#35) node members
                                                                             MEMBER-11 (#36) node evals
                                                                             MEMBER-13 (#38) vote+evals pages
```

**Critical path (longest chain, drives the deadline):**
`INFRA-01 (#4)` → `INFRA-06 (#9)` → `ADMIN-01 (#40) recompute` + `MEMBER-09 (#34)` / `MEMBER-12 (#37)` → `MEMBER-11 (#36)` / `MEMBER-13 (#38)` → `INFRA-08 (#11) E2E` → **Ship (Sep 15)**

**Fork points that block everything downstream (unblock first):**

- `INFRA-02 (#5)` locks API rules → every API read route in Roles 3/4.
- `INFRA-03 (#6)` gates `/dashboard/*` → every dashboard page.
- `INFRA-04 (#7)` seeds data → nothing renders without rows.
- `INFRA-06 (#9)` XP contract → all write routes.
- `ADMIN-01 (#40)` recompute + `ADMIN-08 (#47)` endorsements → `INFRA-08 (#11)` E2E.

**Cross-role coupling:** Role 3 and 4 pages consume Role 2 components (XpBar, StatusChip, TierBadge, StatCard, XpLedgerTable, CycleSelector). Role 2's Week 1–2 component work is on Role 3/4's critical path — do not let it slip.

---

## Definition of Done — standard checklist (every task)

- [ ] Code written in the files/routes listed under _Technical Implementation_ (or approved equivalents)
- [ ] Unit tests covering the DoD specifics below, all passing
- [ ] `make check` green (prettier, eslint, tsc, vitest, next build)
- [ ] Verified against the running dev server (`pnpm dev`, `http://localhost:3000`) where applicable
- [ ] No direct PocketBase schema/seed writes outside `scripts/`
- [ ] No XP writes outside `lib/xp.ts`
- [ ] PR opened (base = previous branch), Conventional Commit title ≤ 72 chars
- [ ] Issue commented with summary + PR link; issue kept open until merge

---

# ROLE 1 — INFRA (Ayham)

Scope: foundations, contracts, seed data, deployment, E2E. Everything else depends on this role. Weekly cadence: W1 foundations, W2 contracts + deployment, W3 handbook, W4 E2E.

### [INFRA-01] Decide Q1–Q10 product questions — **DONE**

- **Objective:** Resolve the 10 open product questions in `docs/PLATFORM.md` §6; record decision + rationale for each; commit tier thresholds to code.
- **Technical Implementation:** `docs/PLATFORM.md` §6 (Q1–Q10 answered, incl. Q1 tiers 0/60/140/300, Q3 vote budget 1+1, Q6 eval pass ≥50), `lib/constants.ts` (`TIER_THRESHOLDS` exported).
- **Dependencies:** Blocked by: none · Blocks: UI-06, ADMIN-01, MEMBER-12.
- **Target Week:** 1 · **Status:** DONE (PR #51, awaiting merge).
- **DoD:** All 10 questions answered in PLATFORM.md; thresholds exported from `lib/constants.ts`; team notified in issue #4.

### [INFRA-02] Lock collection API rules — **DONE**

- **Objective:** Extend `ensureCollection` so every collection's `listRule/viewRule/createRule/updateRule/deleteRule` is explicit: `votes` = deny all client access (anonymization boundary, PLATFORM §5); `endorsements` = public create keyed by token + admin view; `events` = `is_public` view; `xp_ledger`/`user_stats`/`node_member` = admin-only.
- **Technical Implementation:** `scripts/setup-collections.mjs` (access rules per collection), `Makefile` (`make db-setup` idempotent).
- **Dependencies:** Blocked by: none · Blocks: MEMBER-01/02/09/12, ADMIN-03/06/08/09/10.
- **Target Week:** 1 · **Status:** DONE (PR #53).
- **DoD:** `make db-setup` idempotent; votes unreachable from a user-scoped client; rules documented in script header.

### [INFRA-03] Role-aware proxy gating — **DONE**

- **Objective:** `/dashboard` root redirects by role (`node_peer` → `/dashboard/overview`, `node_leader` → `/dashboard/node`, `super_peer`/`super_admin_peer` → `/dashboard/admin`); redirect too-low roles away from `/dashboard/admin*` and `/dashboard/node*` to their role home. Coarse cookie check only — `requireRole` stays the auth boundary.
- **Technical Implementation:** `proxy.ts` (`ROLE_HOMES`, `DASHBOARD_GATES`), `lib/constants.ts`, `proxy.test.ts`.
- **Dependencies:** Blocked by: none · Blocks: every `/dashboard` route in Roles 3/4.
- **Target Week:** 1 · **Status:** DONE (PR #55, 87 tests green).
- **DoD:** Redirect rules covered by tests; verified against running server (307 matrix); `make check` green.

### [INFRA-04] Dev seed script — **DONE**

- **Objective:** `scripts/seed-dev.mjs`: one user per role, 2 nodes with members, a node leader, one active advancement cycle, `xp_ledger` + `user_stats` rows, an event with attendance, evaluations at each stage, votes, one endorsement with a public token.
- **Technical Implementation:** `scripts/seed-dev.mjs`, `package.json` (`db:seed` script), README section.
- **Dependencies:** Blocked by: none · Blocks: every Role 3/4 read view (nothing renders without rows).
- **Target Week:** 1 · **Status:** DONE (PR #54; 58 records, idempotent — 2nd run 0/58).
- **DoD:** `pnpm db:seed` populates a clean local DB; idempotent; documented in README.

### [INFRA-05] Handbook Phase 4 self-review — **DONE**

- **Objective:** Re-read HB-311…355 (24h cooldown per file), check accuracy/completeness/tone/platform rendering, mark REVIEWED. One commit per task: `docs(handbook): HB-XXX <verb> <file>`.
- **Technical Implementation:** `tracker-handbook.md` Phase 4 (handbook repo), per-task commits.
- **Dependencies:** Blocked by: none.
- **Target Week:** 3 · **Status:** DONE (PR #56; 25/25 REVIEWED, snapshot updated).
- **DoD:** All 25 rows REVIEWED; progress snapshot updated.

### [INFRA-06] lib/xp.ts award contract — **DONE**

- **Objective:** Single ledger-write helper `awardXp(user, amount, category, referenceId, referenceType, cycle, awardedBy?)` in `lib/xp.ts`. All XP writes across Roles 3/4 must go through it — vote/event/eval/endorsement awards share one path and one `user_stats` update pattern.
- **Technical Implementation:** `lib/xp.ts` (idempotent per `(user, referenceId)`; inline `user_stats` sync: xp_total increment, tier recompute, `XP_STATS_BUMPS` counters incl. `evaluation_late`; negative amounts clamp at 0; validation errors via `XpError` before DB writes), `lib/xp.test.ts` (20 tests), ARCHITECTURE.md + COMPONENTS.md docs.
- **Dependencies:** Blocked by: none · Blocks: MEMBER-09/12, ADMIN-01/02/05/07/08.
- **Target Week:** 1 · **Status:** DONE (PR #57, 107 tests green).
- **DoD:** Interface frozen in code; unit tests; documented for Roles 3/4.

### [INFRA-07] Deploy PocketBase to Railway — **BLOCKED (external)**

- **Objective:** Move the backend to a teammate's Railway account (current one hit the free-plan resource limit). Run `pb-provision` + `pb-deploy` + `pb-restore`; repoint `NEXT_PUBLIC_POCKETBASE_URL`. Volume at `/pb_data` is **not optional**.
- **Technical Implementation:** `pocketbase/` deploy tooling, `tools/` scripts, `.env` (`NEXT_PUBLIC_POCKETBASE_URL`).
- **Dependencies:** Blocked by: **external — Railway account access (needs Ayham)** · Blocks: none (parallel).
- **Target Week:** 2 · **Status:** BLOCKED — needs the user to grant Railway account access.
- **DoD:** `/api/health` returns 200 on the prod URL; volume mounted; data restored from local `pb_data`.

### [INFRA-08] E2E harness + dashboard smoke tests

- **Objective:** Playwright E2E covering the 4 core flows: login → overview, node leader eval scheduling, super peer recompute, public endorsement submission. Wire into CI.
- **Technical Implementation:** `test/e2e/` (or `e2e/`) specs + config, CI workflow (GitHub Actions) running the suite; flows exercised against dev server + seeded local DB.
- **Dependencies:** Blocked by: INFRA-03 (#6), ADMIN-01 (#40), ADMIN-08 (#47) · Blocks: nothing (final QA gate).
- **Target Week:** 4.
- **DoD:**
  - [ ] 4 flows covered by specs (login→overview, NL eval schedule, SA recompute, public endorse)
  - [ ] Suite green in CI
  - [ ] `make check` still passes

### [INFRA-09] Dashboard team contract docs

- **Objective:** Update `AGENTS.md`/`docs/` with dashboard conventions: API response shape, error handling, component ownership map (Role 2 owns shared components, Roles 3/4 own feature components), ledger write rules.
- **Technical Implementation:** `AGENTS.md`, `docs/COMPONENTS.md`, `docs/ARCHITECTURE.md` (API envelope `{ data, error }`, error codes, ownership table, "XP only via awardXp").
- **Dependencies:** Blocked by: none · Blocks: Roles 3/4 implementation (they implement without cross-questioning the team).
- **Target Week:** 2.
- **DoD:**
  - [ ] Response-shape and error-handling contract documented
  - [ ] Component ownership map (Role 2 shared / Roles 3+4 feature) documented
  - [ ] Ledger write rules documented
  - [ ] Roles 3/4 can implement without cross-questioning the team

### [NOTE → ROLE 1] Idempotency/budget unique indexes (from Role 3, MEMBER-05 / MEMBER-12)

Role 3 will **not** edit `scripts/setup-collections.mjs` (shared infra). To close the
check-then-create race windows behind RSVP, vote-budget validation, the XP ledger and
`user_stats` sync, please add when convenient — our routes already treat duplicates as
idempotent replays / `409`, so nothing here blocks Role 3:

- `event_attendance`: `CREATE UNIQUE INDEX idx_event_attendance_pair ON event_attendance (event, user)`
- `votes`: partial unique index per polarity —
  `CREATE UNIQUE INDEX idx_votes_voter_cycle_positive ON votes (voter, cycle) WHERE polarity = 'positive'`
  and the `negative` counterpart.
- `xp_ledger`: `CREATE UNIQUE INDEX idx_xp_ledger_reference ON xp_ledger (user, reference_id)` (`awardXp` idempotency).
- `user_stats`: `CREATE UNIQUE INDEX idx_user_stats_pair ON user_stats (user, cycle)` (`awardXp` stats sync).

Same-commit rule applies (script + `types/pocketbase.ts` if a type changes).

**Status (2026, post-maintenance-review): NONE of these four landed yet.** The earlier
assumption that "the `votes` indexes came with Role 1's #37 schema work" was checked
against `scripts/setup-collections.mjs` and is **false** — the votes collection has no
indexes. Role 3 re-pinged #37 (votes) and #30 (event_attendance) with a one-business-day
window after the review; this note is the written record for the team channel. Do not
close this NOTE until a `setup-collections.mjs` diff actually shows the indexes.

---

# ROLE 2 — FRONTEND / LANDING + SHARED DASHBOARD COMPONENTS

Scope: public landing (UI-01), the shared dashboard component kit (UI-02…UI-13), and the public `/events` page (UI-15). Role 2 owns **all** of `components/shared/` and `components/ui/` additions; Role 3/4 feature components live in `components/features/`. **Component work is on the critical path for Roles 3/4 — deliver on schedule.**

### [UI-01] Landing page redesign

- **Objective:** New landing sections: mission/values, nodes, events/handbook preview, register CTA. All copy in `content/landing.json` — no hardcoded strings. Old sections stay removed.
- **Technical Implementation:** `app/page.tsx`, `components/features/landing/*`, `content/landing.json`, navbar variants in `components/shared/navbar.tsx`.
- **Dependencies:** Blocked by: none.
- **Target Week:** 1.
- **DoD:** Sections render; content-driven; responsive; WCAG-checked; navbar variants correct; `make check` green.

### [UI-02] DashboardShell

- **Objective:** Navy layout wrapper for all dashboard routes: `DashboardSidebar` + main content area, responsive sidebar collapse, `eng-navy` background.
- **Technical Implementation:** `components/shared/dashboard/dashboard-shell.tsx`, `app/dashboard/layout.tsx` (applies shell), colocated `dashboard-shell.test.tsx`.
- **Dependencies:** Blocked by: none · Blocks: UI-13, ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] Renders children
  - [ ] Collapses below `md` breakpoint
  - [ ] Colocated test passes

### [UI-03] DashboardSidebar

- **Objective:** Left nav rail: avatar, display name, `RoleBadge`, nav links filtered by the user's role via `useAuth()` (from `lib/auth-context.tsx`). Collapsible on mobile.
- **Technical Implementation:** `components/shared/dashboard/dashboard-sidebar.tsx` + test; nav items filtered with `roleAtLeast` (`lib/constants.ts`).
- **Dependencies:** Blocked by: UI-08 (RoleBadge) · Blocks: UI-13, ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] Links filtered per role (member / node leader / super peer see different sets)
  - [ ] Collapse works on mobile
  - [ ] Test passes

### [UI-04] DashboardHeader

- **Objective:** Top bar within the content area: mono page title, breadcrumb, optional actions slot. Compose the existing `Breadcrumb` component.
- **Technical Implementation:** `components/shared/dashboard/dashboard-header.tsx` + test, reusing `components/shared/breadcrumb.tsx`.
- **Dependencies:** Blocked by: none · Blocks: UI-13, ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] Renders title + breadcrumb + slot
  - [ ] Test passes

### [UI-05] RoleGate wrapper

- **Objective:** Renders children only if the current user's role meets a minimum threshold (`roleAtLeast` from `lib/constants`). For conditional sections inside shared pages.
- **Technical Implementation:** `components/shared/dashboard/role-gate.tsx` + test, consuming `useAuth()`.
- **Dependencies:** Blocked by: none · Blocks: UI-13, ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] Works with `useAuth`
  - [ ] Test passes

### [UI-06] XpBar component

- **Objective:** Horizontal progress bar toward the next tier threshold. Mono label shows current / required XP. Zero border-radius, `argc-maroon` fill.
- **Technical Implementation:** `components/shared/xp/xp-bar.tsx` + test; thresholds from `lib/constants.ts` `TIER_THRESHOLDS`.
- **Dependencies:** Blocked by: INFRA-01 (tier thresholds, DONE) · Blocks: MEMBER-03.
- **Target Week:** 1.
- **DoD:**
  - [ ] Correct fill % (current/required from thresholds)
  - [ ] Renders at 0 XP and unknown XP
  - [ ] Test passes

### [UI-07] TierBadge component

- **Objective:** Chip showing tier (Initiate, Contributor, Architect, Vanguard). Hard edges, IBM Plex Mono, uppercase.
- **Technical Implementation:** `components/shared/xp/tier-badge.tsx` + test.
- **Dependencies:** Blocked by: none · Blocks: MEMBER-08.
- **Target Week:** 1.
- **DoD:**
  - [ ] All 4 tiers render
  - [ ] Test passes

### [UI-08] RoleBadge component

- **Objective:** Chip showing member role, same spec as TierBadge. All 5 roles from `types/pocketbase.ts`.
- **Technical Implementation:** `components/shared/dashboard/role-badge.tsx` + test.
- **Dependencies:** Blocked by: none · Blocks: UI-03, MEMBER-08.
- **Target Week:** 1.
- **DoD:**
  - [ ] All 5 roles render
  - [ ] Test passes

### [UI-09] StatusChip component

- **Objective:** Reusable status indicator. Variants: pending, scheduled, completed, missed, approved, rejected, proposed. Hard edges, mono text, zero radius. Consistent across evaluations, events, endorsements.
- **Technical Implementation:** `components/shared/dashboard/status-chip.tsx` + test.
- **Dependencies:** Blocked by: none · Blocks: MEMBER-06/08/09/13/14, ADMIN-05/06, UI-15.
- **Target Week:** 1.
- **DoD:**
  - [ ] Variant map complete (7 variants)
  - [ ] Test passes

### [UI-10] StatCard component

- **Objective:** Single metric: large number + label + optional delta. Flat on navy, no shadows.
- **Technical Implementation:** `components/shared/dashboard/stat-card.tsx` + test.
- **Dependencies:** Blocked by: none · Blocks: UI-13, ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] Renders with/without delta
  - [ ] Test passes

### [UI-11] XpLedgerTable + LoadingRow

- **Objective:** Paginated XP ledger table: date, category, amount, source. Mono for amounts and dates, bordered-row pattern. `LoadingRow` = skeleton row matching bordered-row height. Reuse shadcn `Table` and shared `Skeletons`.
- **Technical Implementation:** `components/shared/xp/xp-ledger-table.tsx` + test, `components/shared/loading-skeleton.tsx`, `components/ui/table.tsx`.
- **Dependencies:** Blocked by: none · Blocks: MEMBER-04, UI-13.
- **Target Week:** 2.
- **DoD:**
  - [ ] Renders rows + skeleton + empty state
  - [ ] Tests pass

### [UI-12] CycleSelector component

- **Objective:** Dropdown or segmented control to switch between advancement cycles. Used on XP and evaluation pages.
- **Technical Implementation:** `components/shared/dashboard/cycle-selector.tsx` + test.
- **Dependencies:** Blocked by: none · Blocks: MEMBER-04, UI-13.
- **Target Week:** 2.
- **DoD:**
  - [ ] Options render
  - [ ] Selection callback fires
  - [ ] Test passes

### [UI-13] Update COMPONENTS.md

- **Objective:** Document every new component from UI-02…12: file path, props, behaviour. Add a row for each.
- **Technical Implementation:** `docs/COMPONENTS.md`.
- **Dependencies:** Blocked by: UI-02, UI-03, UI-04, UI-05, UI-10, UI-11, UI-12.
- **Target Week:** 2.
- **DoD:**
  - [ ] Every new component has a row
  - [ ] No stale entries

### [UI-15] Public /events page (data-driven)

- **Objective:** Follow-up from INFRA-01 decision Q9 (PR #51): rebuild the public events page data-driven from the `events` collection with `is_public = true`, using the existing `EventRow`/`StatusChip` components. Out of dashboard scope by design.
- **Technical Implementation:** `app/events/page.tsx` (+ route/segment), `app/api/public/events/route.ts` (is_public filter through the proxy), `components/features/landing/event-row.tsx`, `components/shared/dashboard/status-chip.tsx`.
- **Dependencies:** Blocked by: INFRA-04 (seed data), UI-09 (StatusChip) · Blocks: none.
- **Target Week:** 4.
- **DoD:**
  - [ ] Public events page renders from PocketBase (is_public only)
  - [ ] Empty state present
  - [ ] Tests pass; `make check` green

---

# ROLE 3 — DASHBOARD CORE: MEMBER + NODE LEADER

Scope: authenticated member pages and APIs under `/api/dashboard/*` and `/dashboard/*`. Minimum role: `node_peer` (M); node-leader tasks marked **NL+** (`requireRole('node_leader')`). Read routes are Week 2; write routes (XP via `awardXp`) are Week 3.

### [MEMBER-01] GET /api/dashboard/me/stats

- **Objective:** Return the authenticated user's current-cycle `user_stats` plus the active advancement cycle. Auth via `requireRole('node_peer')`. Read-only, no live XP calculation.
- **Technical Implementation:** `app/api/dashboard/me/stats/route.ts`, `lib/auth.ts` (`requireRole`), `lib/pocketbase-server.ts`, admin-scoped queries (xp_ledger/user_stats are admin-only per INFRA-02).
- **Dependencies:** Blocked by: INFRA-02, INFRA-04 · Blocks: MEMBER-03.
- **Target Week:** 2.
- **DoD:**
  - [x] 401/403 for anonymous/too-low role
  - [x] Correct payload (stats + active cycle)
  - [x] Tests pass; `make check` green

### [MEMBER-02] GET /api/dashboard/me/xp

- **Objective:** Paginated XP ledger history for the authenticated user. Query params: `cycle`, `page`, `limit`.
- **Technical Implementation:** `app/api/dashboard/me/xp/route.ts` (pagination envelope, cycle filter).
- **Dependencies:** Blocked by: INFRA-02, INFRA-04 · Blocks: MEMBER-04.
- **Target Week:** 2.
- **DoD:**
  - [x] Pagination + cycle filter work
  - [x] Tests pass

### [MEMBER-03] /dashboard/overview page

- **Objective:** Personal summary: XP total + tier + cycle progress (XpBar), evaluation status, upcoming events, node name. Server component; `EmptyState` for missing data.
- **Technical Implementation:** `app/dashboard/overview/page.tsx` (server component), `components/shared/xp/xp-bar.tsx`, `components/shared/empty-state.tsx`, fetches MEMBER-01 data via internal API call.
- **Dependencies:** Blocked by: UI-06, MEMBER-01, INFRA-04 · Blocks: none.
- **Target Week:** 2 (page shell) / 3 (final data wiring).
- **DoD:**
  - [ ] Renders from MEMBER-01 data
  - [ ] Empty states for missing data
  - [ ] Tests pass

### [MEMBER-04] /dashboard/xp page

- **Objective:** Full XP history: `XpLedgerTable`, XP breakdown by category, `CycleSelector`.
- **Technical Implementation:** `app/dashboard/xp/page.tsx`, `components/shared/xp/xp-ledger-table.tsx`, `components/shared/dashboard/cycle-selector.tsx`, fetches MEMBER-02 data.
- **Dependencies:** Blocked by: UI-11, UI-12, MEMBER-02 · Blocks: none.
- **Target Week:** 2.
- **DoD:**
  - [ ] Renders from MEMBER-02
  - [ ] Empty state present
  - [ ] Tests pass

### [MEMBER-05] Events API + RSVP — **DONE**

- **Objective:** `GET /api/dashboard/events` (events relevant to the user: attending + upcoming public) and `POST /api/dashboard/events/[id]/rsvp` (writes `event_attendance`). Prevent duplicate RSVPs.
- **Technical Implementation:** `app/api/dashboard/events/route.ts`, `app/api/dashboard/events/[id]/rsvp/route.ts` (idempotent create — no duplicate `event_attendance` rows).
- **Dependencies:** Blocked by: INFRA-04 · Blocks: MEMBER-06.
- **Target Week:** 3.
- **DoD:**
  - [x] Idempotent RSVP — no duplicates
  - [x] Tests pass

### [MEMBER-06] /dashboard/events page

- **Objective:** Upcoming events + events the user attends/organizes, RSVP button wired to MEMBER-05. `StatusChip` for event status.
- **Technical Implementation:** `app/dashboard/events/page.tsx`, `components/shared/dashboard/status-chip.tsx`, client RSVP button calling MEMBER-05.
- **Dependencies:** Blocked by: MEMBER-05, UI-09 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] RSVP flow works end to end
  - [ ] StatusChip used for event status
  - [ ] Tests pass

### [MEMBER-07] GET /api/dashboard/node/me

- **Objective:** Return the caller's current node and its members (with user expand, tier, eval status).
- **Technical Implementation:** `app/api/dashboard/node/me/route.ts` (node lookup by member record; `expand` members' users; join user_stats + evaluations).
- **Dependencies:** Blocked by: INFRA-02, INFRA-04 · Blocks: MEMBER-08, MEMBER-10.
- **Target Week:** 2.
- **DoD:**
  - [x] Correct payload (node + members with tier/eval status)
  - [x] Tests pass

### [MEMBER-08] /dashboard/node page

- **Objective:** Node overview: node name, cohort, node leader, member list with `TierBadge` + evaluation status (`StatusChip`).
- **Technical Implementation:** `app/dashboard/node/page.tsx`, `components/shared/xp/tier-badge.tsx`, `components/shared/dashboard/status-chip.tsx`.
- **Dependencies:** Blocked by: UI-07, UI-09, MEMBER-07 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] Renders from MEMBER-07
  - [ ] Tests pass

### [MEMBER-09] NL eval API + schedule form — **NL+**

- **Objective:** `GET /api/dashboard/node/evaluations` (all evals for the caller's node) and `PATCH /api/dashboard/node/evaluations/[id]` (schedule, mark complete, update score). Build `EvaluationScheduleForm` and `EvaluationPipelineCard`. Ledger writes via `lib/xp.ts`.
- **Technical Implementation:** `app/api/dashboard/node/evaluations/route.ts`, `app/api/dashboard/node/evaluations/[id]/route.ts` (stage/status transition validation), `components/features/node/evaluation-schedule-form.tsx`, `components/features/node/evaluation-pipeline-card.tsx`, `lib/xp.ts` `awardXp` on completion.
- **Dependencies:** Blocked by: INFRA-02, INFRA-06, UI-09 · Blocks: MEMBER-11.
- **Target Week:** 3.
- **DoD:**
  - [ ] NL gate on all routes
  - [ ] Stage/status transitions validated (e.g., cannot complete an unscheduled eval)
  - [ ] XP awarded exactly once on completion
  - [ ] Tests pass

### [MEMBER-10] /dashboard/node/members page — **NL+**

- **Objective:** Full member table for the leader's node: XP per member, evaluation stage, attendance record. `NodeMemberRow` component.
- **Technical Implementation:** `app/dashboard/node/members/page.tsx`, `components/features/node/node-member-row.tsx`.
- **Dependencies:** Blocked by: MEMBER-07 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] NL gate
  - [ ] Tests pass

### [MEMBER-11] /dashboard/node/evaluations page — **NL+**

- **Objective:** Manage the node's evaluation schedule: assign evaluators, mark completions, flag issues. Wired to MEMBER-09 API.
- **Technical Implementation:** `app/dashboard/node/evaluations/page.tsx`, forms from MEMBER-09.
- **Dependencies:** Blocked by: MEMBER-09 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] NL gate
  - [ ] Schedule + complete flows work
  - [ ] Tests pass

### [MEMBER-12] Vote API + VoteCastForm — **DONE**

- **Objective:** `GET /api/dashboard/vote/eligible`, `/vote/my-votes`, `/vote/summary` (aggregate counts only — never voter IDs), `POST /api/dashboard/vote` (validates cross-node, one positive/negative per cycle, cycle active; ledger write via `lib/xp.ts`). Build `VoteCastForm` with confirmation step.
- **Technical Implementation:** `app/api/dashboard/vote/{eligible,my-votes,summary}/route.ts`, `app/api/dashboard/vote/route.ts`, `components/features/vote/vote-cast-form.tsx`, `lib/xp.ts` (vote award on cast, per Q3 budget).
- **Dependencies:** Blocked by: INFRA-01 (Q3 vote budget, DONE), INFRA-02, INFRA-06 · Blocks: MEMBER-13.
- **Target Week:** 3.
- **Status:** DONE (PR #63 → `main` @ `7059ee3`; 209 tests green; issue #37 closed).
- **DoD:**
  - [x] Member gate; anonymous to members (aggregate counts only)
  - [x] One +/− per cycle enforced
  - [x] Cross-node validation (can't vote for own node)
  - [x] Cycle must be active
  - [x] Tests pass

### [MEMBER-13] /dashboard/vote + /dashboard/evaluations pages

- **Objective:** Vote page (`VoteCastForm` + own votes this cycle) and the member's own evaluation history (`GET /api/dashboard/me/evaluations`, 3 stages per cycle with `EvaluationStageRow`).
- **Technical Implementation:** `app/dashboard/vote/page.tsx`, `app/dashboard/evaluations/page.tsx`, `app/api/dashboard/me/evaluations/route.ts`, `components/features/vote/vote-cast-form.tsx`, `components/features/evaluations/evaluation-stage-row.tsx`, `components/shared/dashboard/status-chip.tsx`.
- **Dependencies:** Blocked by: MEMBER-12, UI-09 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] Both pages render with real data
  - [ ] Own votes shown for current cycle
  - [ ] 3 evaluation stages per cycle shown
  - [ ] Tests pass

### [MEMBER-14] Event propose — **NL+**

- **Objective:** `GET/POST /api/dashboard/node/events` and `EventProposeForm` (title, type, description, proposed dates, location). Reuse `Field`/`FieldArea` primitives.
- **Technical Implementation:** `app/api/dashboard/node/events/route.ts`, `components/features/node/event-propose-form.tsx`, `components/shared/field.tsx`.
- **Dependencies:** Blocked by: INFRA-04, UI-09 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] NL gate
  - [ ] Event lands as `status = proposed`
  - [ ] Tests pass

---

# ROLE 4 — DASHBOARD ADMIN: SUPER PEER + SUPER ADMIN

Scope: `/api/admin/*` and `/dashboard/admin/*`. **SP+** = `requireRole('super_peer')`; **SA** = `requireRole('super_admin_peer')`. Admin pages consume Role 2 shared components. Reads are Week 2, writes are Week 3, de-anonymized votes/endorsements/cycles are Week 4.

### [ADMIN-01] POST /api/admin/xp/recompute — **SA**

- **Objective:** Idempotent recompute engine: reads all `xp_ledger` entries for a cycle, rebuilds `user_stats` fresh, assigns tier from thresholds. SA only. Running twice yields the same result.
- **Technical Implementation:** `app/api/admin/xp/recompute/route.ts` (full-cycle rebuild; tier from `lib/constants.ts` `TIER_THRESHOLDS`; idempotent by construction — no accumulation).
- **Dependencies:** Blocked by: INFRA-01 (thresholds), INFRA-06, INFRA-02 · Blocks: INFRA-08.
- **Target Week:** 3.
- **DoD:**
  - [ ] Idempotency proven by test (run twice → identical state)
  - [ ] SA gate enforced
  - [ ] `make check` green

### [ADMIN-02] Manual XP award + form — **SP+**

- **Objective:** `POST /api/admin/xp/award` (manual ledger write via `lib/xp.ts`) plus `XpAwardForm` and `MemberSearchCombobox` (autocomplete member select). SP only.
- **Technical Implementation:** `app/api/admin/xp/award/route.ts`, `components/features/admin/xp-award-form.tsx`, `components/features/admin/member-search-combobox.tsx`.
- **Dependencies:** Blocked by: INFRA-06 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] SP gate
  - [ ] Award lands in ledger + `user_stats` (via `awardXp`)
  - [ ] Tests pass

### [ADMIN-03] Members admin API — **SP+**

- **Objective:** `GET /api/admin/members` (filters: node, tier, role, search) and `GET /api/admin/members/[userId]` (full profile: stats, ledger, evaluations, votes, endorsements).
- **Technical Implementation:** `app/api/admin/members/route.ts`, `app/api/admin/members/[userId]/route.ts` (filters via PocketBase queries; full profile via admin client).
- **Dependencies:** Blocked by: INFRA-02, INFRA-04 · Blocks: ADMIN-04.
- **Target Week:** 2.
- **DoD:**
  - [ ] SP gate
  - [ ] All filters work
  - [ ] Tests pass

### [ADMIN-04] /dashboard/admin + member views — **SP+**

- **Objective:** Admin overview (all node statuses, current cycle progress, pending approvals count) + member directory + individual member detail pages wired to ADMIN-03.
- **Technical Implementation:** `app/dashboard/admin/page.tsx`, `app/dashboard/admin/members/page.tsx`, `app/dashboard/admin/members/[userId]/page.tsx`, `components/shared/dashboard/stat-card.tsx` (metrics), shell components from UI-02…05.
- **Dependencies:** Blocked by: UI-02, UI-03, UI-04, UI-05, UI-10, ADMIN-03 · Blocks: none.
- **Target Week:** 2 (reads) / 3 (final wiring).
- **DoD:**
  - [ ] SP gate
  - [ ] Renders real data
  - [ ] Empty states present
  - [ ] Tests pass

### [ADMIN-05] Evaluation pipeline admin — **SP+**

- **Objective:** `GET /api/admin/evaluations` (all nodes, filterable) + `PATCH /api/admin/evaluations/[id]` (full update + trigger XP award via `lib/xp.ts`) + `/dashboard/admin/evaluations` view with admin `EvaluationPipelineCard`.
- **Technical Implementation:** `app/api/admin/evaluations/route.ts`, `app/api/admin/evaluations/[id]/route.ts`, `app/dashboard/admin/evaluations/page.tsx`, `components/features/admin/evaluation-pipeline-card.tsx`.
- **Dependencies:** Blocked by: INFRA-02, INFRA-06 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] SP gate
  - [ ] XP awarded exactly once (idempotent via `awardXp`)
  - [ ] Tests pass

### [ADMIN-06] Votes admin API + view — **SP+**

- **Objective:** `GET /api/admin/votes` (full records, voter identity revealed) + `DELETE /api/admin/votes/[id]` (remove fraudulent votes) + `/dashboard/admin/votes` view. SP only.
- **Technical Implementation:** `app/api/admin/votes/route.ts`, `app/api/admin/votes/[id]/route.ts` (DELETE), `app/dashboard/admin/votes/page.tsx`, `components/shared/dashboard/status-chip.tsx`.
- **Dependencies:** Blocked by: INFRA-02, UI-09 · Blocks: none.
- **Target Week:** 4.
- **DoD:**
  - [ ] SP gate
  - [ ] De-anonymized view (voter identity visible)
  - [ ] Fraudulent vote removal works
  - [ ] Tests pass

### [ADMIN-07] Events admin + XP award — **SP+**

- **Objective:** `GET /api/admin/events` + `PATCH /api/admin/events/[id]` (approve, mark completed, attendance count) + `POST /api/admin/events/[id]/award-xp` (bulk ledger write per confirmed attendee via `lib/xp.ts`) + `/dashboard/admin/events` view.
- **Technical Implementation:** `app/api/admin/events/route.ts`, `app/api/admin/events/[id]/route.ts`, `app/api/admin/events/[id]/award-xp/route.ts`, `app/dashboard/admin/events/page.tsx`.
- **Dependencies:** Blocked by: INFRA-04, INFRA-06 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] SP gate
  - [ ] Bulk award idempotent (re-running awards nothing new)
  - [ ] Tests pass

### [ADMIN-08] Endorsements public + admin

- **Objective:** Public `/endorse/[token]` page with `EndorsementForm` + `GET/POST /api/endorse/[token]` (token validates, creates/updates record). Admin side: `GET /api/admin/endorsements` + `PATCH /api/admin/endorsements/[id]` (verify + award XP via `lib/xp.ts`) + `/dashboard/admin/endorsements` view.
- **Technical Implementation:** `app/endorse/[token]/page.tsx`, `app/api/endorse/[token]/route.ts` (public, token-keyed; create rule per INFRA-02), `app/api/admin/endorsements/route.ts`, `app/api/admin/endorsements/[id]/route.ts`, `app/dashboard/admin/endorsements/page.tsx`, `components/features/endorsements/endorsement-form.tsx`.
- **Dependencies:** Blocked by: INFRA-01 (Q5 token flow), INFRA-02, INFRA-06 · Blocks: INFRA-08.
- **Target Week:** 4.
- **DoD:**
  - [ ] Public flow works without auth
  - [ ] Verification awards XP once (idempotent)
  - [ ] Tests pass

### [ADMIN-09] Nodes admin API + view — **SP+**

- **Objective:** `GET /api/admin/nodes` + `POST /api/admin/nodes` + `PATCH /api/admin/nodes/[id]` (update, assign leader, add/remove members) + `/dashboard/admin/nodes` view.
- **Technical Implementation:** `app/api/admin/nodes/route.ts`, `app/api/admin/nodes/[id]/route.ts`, `app/dashboard/admin/nodes/page.tsx`.
- **Dependencies:** Blocked by: INFRA-02, INFRA-04 · Blocks: none.
- **Target Week:** 2 (reads) / 3 (writes).
- **DoD:**
  - [ ] SP gate
  - [ ] Leader assignment + member add/remove work
  - [ ] Tests pass

### [ADMIN-10] Cycles admin API + view — **SA on mutations**

- **Objective:** `GET /api/admin/cycles` + `POST /api/admin/cycles` (SA) + `PATCH /api/admin/cycles/[id]` (SA: open, close) + `/dashboard/admin/cycles` view.
- **Technical Implementation:** `app/api/admin/cycles/route.ts`, `app/api/admin/cycles/[id]/route.ts`, `app/dashboard/admin/cycles/page.tsx`.
- **Dependencies:** Blocked by: INFRA-02 · Blocks: none.
- **Target Week:** 4.
- **DoD:**
  - [ ] SA gate on mutations
  - [ ] Open/close transitions validated
  - [ ] Tests pass

### [ADMIN-11] Role change API — **SA**

- **Objective:** `PATCH /api/admin/members/[userId]/role` — change a member's role. SA only. Must keep `pb_role` cookie semantics in mind (V1 already refreshes it on `/api/auth/me`).
- **Technical Implementation:** `app/api/admin/members/[userId]/role/route.ts`; verify cookie refresh path via `app/api/auth/me`.
- **Dependencies:** Blocked by: INFRA-02 · Blocks: none.
- **Target Week:** 3.
- **DoD:**
  - [ ] SA gate
  - [ ] Role change persists + cookie semantics preserved
  - [ ] Test passes

---

## Delivery Calendar

| Week | Dates     | Milestone            | Role 1                       | Role 2                                    | Role 3                                   | Role 4                 |
| ---- | --------- | -------------------- | ---------------------------- | ----------------------------------------- | ---------------------------------------- | ---------------------- |
| 1    | Aug 16–23 | **Foundations**      | INFRA-01..06 (DONE)          | UI-01, UI-06..09 — **overdue, start now** | — (blocked on Role 2)                    | — (blocked on Role 2)  |
| 2    | Aug 24–31 | **Reads & Shell**    | INFRA-09, INFRA-07 (Railway) | UI-02..05, UI-10..13                      | MEMBER-01/02/03/04/07, admin reads start | ADMIN-03/04/09 (reads) |
| 3    | Sep 1–7   | **Writes & Logic**   | INFRA-05 (DONE)              | —                                         | MEMBER-05/06/08/09/10/11/12/13/14        | ADMIN-01/02/05/07/11   |
| 4    | Sep 8–15  | **Integration & QA** | INFRA-08 (E2E)               | UI-15                                     | —                                        | ADMIN-06/08/10         |

## Shipping Gate (Sep 15)

- [ ] All Week 1–4 milestones closed
- [ ] INFRA-08 E2E suite green in CI (4 core flows)
- [ ] Public flows verified: `/events`, `/endorse/[token]`
- [ ] `/api/health` 200 on production URL
- [ ] `make check` green on `main`
