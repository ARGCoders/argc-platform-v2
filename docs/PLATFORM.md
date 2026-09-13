
# ARGC Dashboard — Full Planning Specification

## Preliminary Notes from Codebase Audit

Before the plan: a few observations from the existing code that affect the spec.

1. **`proxy.ts` is not functioning as middleware.** Next.js middleware must be at `middleware.ts` in the project root. The current file is named `proxy.ts` — it is never invoked automatically. The dashboard route guard currently has no teeth. This must be fixed before dashboard work begins.
2. **Roles already defined.** `types/pocketbase.ts` has: `'guest' | 'node_peer' | 'node_leader' | 'super_peer' | 'super_admin_peer'`. The spec mentions "Member", "Node Leader", "Super Peer" — these map to `node_peer`, `node_leader`, and `super_peer`/`super_admin_peer`.
3. **The dashboard page is a blank stub.** `app/dashboard/page.tsx` renders only avatar + display name + role label. No sub-routes, no sidebar, no real data.
4. **Events are fully hardcoded.** `SectionEvents.tsx` has static data — no PocketBase collection exists for events yet.
5. **No collections exist yet** for XP, votes, evaluations, or nodes. Only `users`, `submissions`, `posts`, `post_images` are confirmed to exist.

---

## 1. PocketBase Schema

### Existing Collections (not changed)

| Collection | Notes |
| --- | --- |
| users | Already has role, intra_login, display_name, avatar_url |
| submissions | Membership applications |
| posts / post_images | Blog system |

### New Collections Required

#### node

The structural unit of ARGC. A node is a cohort-aligned group of 3–6 members.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| name | text | e.g. "Node Epsilon" |
| slug | text, unique | e.g. "epsilon" |
| cohort | text | e.g. "c25" |
| status | select | active, inactive, archived |
| created | auto | |
| updated | auto | |

#### node_member

Join table between users and nodes (a user can theoretically move nodes across cycles).

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| role | select | member, leader |
| user | relation → users | |
| node | relation → nodes | |
| joined_at | date | |
| left_at | date? | |

#### achievements (info / lookup table)

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| title | string | |
| profile_prefix | string? | |
| image | image | |
| description | string | |
| is_active | bool | |
| created_at | date | |
| updated_at | date? | |

#### node_achievement

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| node | relation → node | |
| achievement | relation → achievement | |
| created_at | date | |

#### user_achievement

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| user | relation → user | |
| achievement | relation → achievement | |
| created_at | date | |

#### xp_ledger

Immutable append-only log of every XP event. XP is never calculated live — it is always read from this ledger. Totals are stored on `user_stats` (see below) and recomputed by a batch process.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| user | relation → users | recipient |
| amount | number | can be negative (penalty/adjustment) |
| category | select | see XP categories below |
| reference_id | text | ID of the source record (event, evaluation, vote, etc.) |
| reference_type | select | evaluation, event, knowledge_session, cross_node, hackathon, endorsement, vote, manual |
| awarded_by | relation → users | null = system |
| cycle | relation → advancement_cycles | which cycle this XP belongs to |
| note | text | optional human note |
| created | auto | |

XP category values: `evaluation_on_time`, `evaluation_late`, `event_organized`, `event_attended`, `knowledge_session`, `cross_node_contribution`, `hackathon`, `endorsement_received`, `cross_node_vote_received`, `manual_adjustment`

#### user_stats

Denormalized snapshot of a user's current XP totals per cycle. Updated by the batch cycle process, not in real-time.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| user | relation → users | unique per user+cycle |
| cycle | relation → advancement_cycles | |
| xp_total | number | sum of all xp_ledger entries for this user+cycle |
| tier | select | Initiate, Contributor, Architect, Vanguard |
| evaluations_completed | number | |
| evaluations_late | number | |
| events_organized | number | |
| events_attended | number | |
| knowledge_sessions | number | |
| cross_node_contributions | number | |
| endorsements_received | number | |
| votes_received_positive | number | |
| last_computed_at | date | |

#### advancement_cycles

Defines the time-bounded advancement periods (e.g. a semester or quarter).

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| label | text | e.g. "Spring 2025" |
| slug | text, unique | e.g. "spring-2025" |
| starts_at | date | |
| ends_at | date | |
| status | select | upcoming, active, closed |
| created_by | relation → users | super_peer |

#### evaluations

Tracks the 3-stage evaluation pipeline per member per cycle.
The evaluation club would be after standard evaluation from now on

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| evaluatee | relation → users | the member being evaluated |
| evaluator | relation → users | who conducts the eval (can be null for unassigned) |
| cycle | relation → advancement_cycles | |
| stage | select | after pass the standard evaluation |
| status | select | pending, scheduled, completed, missed |
| scheduled_at | date | |
| completed_at | date | null until done |
| score | number | 0–100 or as defined by ARGC rubric |
| notes | text (private) | visible to super_peer + node_leader only |
| xp_awarded | bool | whether xp has been posted to ledger |
| created | auto | |
| updated | auto | |

#### events

Replaces the current hardcoded `SectionEvents.tsx` data.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| title | text | |
| slug | text, unique | |
| poster photo | image, auto | |
| description | text | |
| type | select | knowledge_session, hackathon, workshop, community, cross_node |
| proposed_by | relation → nodes | which node proposed it |
| organized_by | relation → users | primary organizer |
| cycle | relation → advancement_cycles | |
| status | select | proposed, approved, scheduled, completed, cancelled |
| starts_at | date | |
| ends_at | date | |
| location | text | |
| is_public | bool | whether visible on the public /events page |
| attendance_count | number | filled in post-event |
| xp_awarded | bool | |
| created | auto | |
| updated | auto | |

#### event_attendance

Who attended which event. Source of attendance-based XP.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| event | relation → events | |
| user | relation → users | |
| role | select | organizer, attendee, speaker |
| confirmed | bool | confirmed by organizer/super_peer |
| xp_awarded | bool | |
| created | auto | |

#### votes

Internal cross-node votes. Positive or negative. Anonymous to members, visible to super_peers.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| voter | relation → users | |
| subject | relation → users | who is being voted on |
| cycle | relation → advancement_cycles | |
| polarity | select | positive, negative |
| reason | text | required justification |
| is_cross_node | bool | voter and subject are in different nodes |
| created | auto | |

**Anonymization strategy:** The `voter` field is never exposed via any API route that a `node_peer` or `node_leader` calls. Super peer API routes return the full record. Member-facing routes return aggregate counts only (e.g., `{ positive: 3, negative: 1 }` per cycle), never individual voter identities.

#### endorsements

External endorsements — positive-only, submitted via a public link. These differ from internal votes.

| Field | Type | Notes |
| --- | --- | --- |
| id | auto | |
| subject | relation → users | ARGC member being endorsed |
| endorser_name | text | endorser's full name (non-member) |
| endorser_email | text | for verification |
| endorser_relation | text | e.g. "peer at 42", "project partner" |
| message | text | the endorsement text |
| verified | bool | reviewed by super_peer |
| public_token | text, unique | the token in the public endorsement link |
| cycle | relation → advancement_cycles | |
| xp_awarded | bool | |
| created | auto | |

#### xp_awards (Super Peer manual awards)

For manual XP grants that don't fit a category (recognition, corrections). This is handled through `xp_ledger` with `reference_type = 'manual'` and `awarded_by` set to the super_peer's user ID. No separate collection needed.

---

## 2. Route Map

All dashboard routes are under `/dashboard`. Access levels: M = node_peer, NL = node_leader, SP = super_peer, SA = super_admin_peer.

### `/dashboard` — Root redirect

Redirects to role-appropriate default view:
- node_peer → `/dashboard/overview`
- node_leader → `/dashboard/node`
- super_peer → `/dashboard/admin`

### Member Routes (M, NL, SP, SA)

| Route | Access | Description |
| --- | --- | --- |
| /dashboard/overview | M+ | Personal summary: XP total, tier, cycle progress, evaluation status, upcoming events, node name |
| /dashboard/xp | M+ | Full XP history: ledger entries with category, date, source; XP breakdown by category; cycle selector |
| /dashboard/evaluations | M+ | Member's own evaluation records: 3 stages per cycle, scheduled dates, completion status, scores |
| /dashboard/events | M+ | Events the member is attending or has organized; upcoming events; ability to RSVP |
| /dashboard/vote | M+ | Cast internal votes: list of eligible cross-node members, one positive and one negative per cycle; confirmation screen |
| /dashboard/node | M+ | Node overview: node name, cohort, node leader, list of members with their tier badges and evaluation status |

### Node Leader Routes (NL, SP, SA)

| Route | Access | Description |
| --- | --- | --- |
| /dashboard/node/members | NL+ | Full member table for the leader's node: XP per member, evaluation stage, attendance record |
| /dashboard/node/evaluations | NL+ | Manage evaluation schedule for the node: assign evaluators, mark completions, flag issues |
| /dashboard/node/events/propose | NL+ | Propose a new event: fill event form, select type, link to cycle |
| /dashboard/node/flag | NL+ | Flag an issue (evaluation missed, member concern) — goes into super_peer review queue |

### Super Peer Routes (SP, SA)

| Route | Access | Description |
| --- | --- | --- |
| /dashboard/admin | SP+ | Super peer overview: all nodes status, current cycle progress, pending approvals count |
| /dashboard/admin/members | SP+ | Full member directory: search/filter by node, tier, role; view any member's XP and evaluation history |
| /dashboard/admin/members/[userId] | SP+ | Individual member detail: full XP ledger, all 3 evaluations, vote summary, endorsements |
| /dashboard/admin/xp/award | SP+ | Manual XP award form: select member, amount, category, note |
| /dashboard/admin/votes | SP+ | Full voting records for current cycle: voter + subject + polarity + reason (de-anonymized for SP) |
| /dashboard/admin/events | SP+ | All events across all nodes: approve proposed events, mark attendance, confirm XP awards |
| /dashboard/admin/evaluations | SP+ | Full evaluation pipeline view: all members, all stages, completion rates, flagged items |
| /dashboard/admin/cycles | SP+ (SA only) | Manage advancement cycles: create, open, close cycles; trigger XP recompute |
| /dashboard/admin/endorsements | SP+ | Review external endorsements: verify, approve for XP award |
| /dashboard/admin/nodes | SP+ | Node management: create nodes, assign members, designate node leaders |

### Public Route (no auth)

| Route | Access | Description |
| --- | --- | --- |
| /endorse/[token] | Public | External endorsement submission form (lives outside /dashboard) |

---

## 3. Component Inventory

### Layout Components

| Component | Description |
| --- | --- |
| DashboardShell | Root layout wrapper for all dashboard routes. eng-navy background. Contains DashboardSidebar + main content area. Manages responsive sidebar collapse. |
| DashboardSidebar | Left navigation rail. Shows user avatar, display name, role badge, nav links filtered by role. Collapsible on mobile. |
| DashboardHeader | Top bar within main content area. Page title (mono label style), breadcrumb, optional actions slot. |
| RoleGate | Wrapping component that renders children only if the current user's role meets a minimum threshold. Used for conditional UI sections within shared pages. |

### Data Display Components

| Component | Description |
| --- | --- |
| XpBar | Horizontal progress bar showing XP toward next tier threshold. Label shows current / required XP in mono font. Zero border-radius, fills with argc-maroon. |
| TierBadge | Chip showing tier name (Initiate, Contributor, Architect, Vanguard). Hard edges, IBM Plex Mono, uppercase. |
| RoleBadge | Chip showing member role. Same spec as TierBadge. |
| XpLedgerTable | Paginated table of XP ledger entries. Columns: date, category, amount, source. Mono for amounts and dates. Bordered-row pattern. |
| StatCard | Single metric display: large number + label + optional delta indicator. Used on overview and admin dashboards. No shadows, flat on navy. |
| EvaluationStageRow | One row per evaluation stage. Shows stage name, evaluator name, status chip, scheduled date, score (if complete). |
| EvaluationPipelineCard | Groups the 3 evaluation stages for a single member into one card unit. Used in node leader view. |
| NodeMemberRow | Bordered-row listing of a single node member: avatar, name, tier badge, XP number, evaluation stage indicator. |
| EventRow | Bordered-row variant for events: date (mono) |
| VoteSummaryRow | Shows a member's vote summary for the cycle: positive count, negative count. Member-facing = counts only. SP-facing = expandable to show individual voters. |
| CycleSelector | Dropdown or segmented control to switch between advancement cycles. Used on XP and evaluation history pages. |
| EmptyState | Consistent empty state for tables/lists. Short mono label + single line of body text. No illustrations, no friendly icons. Matches ARGC tone. |

### Form Components

| Component | Description |
| --- | --- |
| VoteCastForm | Vote casting UI. Shows eligible cross-node members, allows selecting one positive and one negative subject per cycle. Confirmation step before submit. |
| EventProposeForm | Node leader proposal filing surface. Fields: title, type, description, `datetime-local` starts_at (client-side future check, JS validation instead of native `required`), optional location, is_public toggle. Uses existing Field/FieldArea/FieldWrapper primitives. |
| XpAwardForm | Super peer manual XP award. Select member (search), amount, category, note. |
| EvaluationScheduleForm | Node leader tool to schedule an evaluation: pick evaluator, set date. |
| EndorsementForm | Public-facing endorsement submission: endorser name, email, relation, message. Lives at /endorse/[token]. |
| MemberSearchCombobox | Autocomplete input to search and select an ARGC member. Used in XpAwardForm and admin member filtering. |

### Status & Feedback Components

| Component | Description |
| --- | --- |
| StatusChip | Reusable status indicator. Variants: pending, scheduled, completed, missed, approved, rejected, proposed. Hard edges, mono text, zero radius. Consistent across evaluations, events, endorsements. |
| FlagAlert | Inline alert for flagged items in node leader / SP views. No softness — stark border-left 1px argc-maroon, mono label. |
| LoadingRow | Skeleton placeholder for a single data row while loading. Matches bordered-row height. |

---

## 4. API Route Map

All routes under `/api/dashboard/` (or `/api/admin/` for super-peer-only operations). Auth is validated on every route via `pb_auth` cookie.

**Auth helper pattern (reuse existing):** Every protected route: read `pb_auth` cookie → `pb.authStore.save(token)` → `pb.collection('users').authRefresh()` → check role.

### Overview & Stats

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/dashboard/me/stats | GET | M+ | user_stats, advancement_cycles | — | Returns current cycle stats for authenticated user |
| /api/dashboard/me/xp | GET | M+ | xp_ledger | — | Paginated XP history for authenticated user. Query params: cycle, page, limit |

### Evaluations

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/dashboard/me/evaluations | GET | M+ | evaluations | — | The 3 evaluations for the current user across all cycles |
| /api/dashboard/node/evaluations | GET | NL+ | evaluations, users | — | All evaluations for members of the caller's node |
| /api/dashboard/node/evaluations/[id] | PATCH | NL+ | — | evaluations | Schedule, mark complete, update score |
| /api/admin/evaluations | GET | SP+ | evaluations, users, nodes | — | All evaluations across all nodes, filterable |
| /api/admin/evaluations/[id] | PATCH | SP+ | — | evaluations, xp_ledger | Full update + trigger XP award |

### Events

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/dashboard/events | GET | M+ | events, event_attendance | — | Events relevant to the user (attending + upcoming public). `attendance_count` is the stored post-event figure — not live RSVPs; use the per-event `attending` flag / attendance rows for sign-ups |
| /api/dashboard/events/[id]/rsvp | POST | M+ | — | event_attendance | RSVP to an event. Writes `confirmed: false`; does NOT bump `attendance_count` (admin fills that on completion) |
| /api/dashboard/node/events | GET | NL+ | events | — | Events proposed/organized by the caller's node |
| /api/dashboard/node/events | POST | NL+ | — | events | Propose a new event |
| /api/admin/events | GET | SP+ | events, event_attendance | — | All events, all statuses |
| /api/admin/events/[id] | PATCH | SP+ | — | events | Approve, mark completed, update attendance count |
| /api/admin/events/[id]/award-xp | POST | SP+ | event_attendance | xp_ledger, event_attendance, user_stats | Award XP to all confirmed attendees |

### Voting

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/dashboard/vote/eligible | GET | M+ | users, node_members, votes | — | Returns eligible vote subjects (cross-node, not already voted) |
| /api/dashboard/vote/my-votes | GET | M+ | votes | — | Current cycle votes cast by the user (own record only) |
| /api/dashboard/vote/summary | GET | M+ | votes | — | Aggregate vote counts received by the user (no voter IDs) |
| /api/dashboard/vote | POST | M+ | — | votes, xp_ledger | Cast a vote. Validates: cross-node, one positive/negative per cycle, cycle active |
| /api/admin/votes | GET | SP+ | votes, users | — | Full vote records with voter identity revealed |
| /api/admin/votes/[id] | DELETE | SP+ | — | votes | Remove fraudulent/invalid vote |

### XP & Manual Awards

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/admin/xp/award | POST | SP+ | — | xp_ledger, user_stats | Manual XP grant: { userId, amount, category, note, cycleId } |
| /api/admin/xp/recompute | POST | SA only | xp_ledger | user_stats | Recalculates all user_stats totals for a given cycle. Idempotent. |

### Nodes & Members

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/dashboard/node/me | GET | M+ | nodes, node_members, users | — | The caller's current node and its members |
| /api/admin/nodes | GET | SP+ | nodes, node_members | — | All nodes |
| /api/admin/nodes | POST | SP+ | — | nodes | Create a new node |
| /api/admin/nodes/[id] | PATCH | SP+ | — | nodes, node_members | Update node, assign leader, add/remove members |
| /api/admin/members | GET | SP+ | users, user_stats, node_members | — | All members, expandable with stats. Query: node, tier, role, search |
| /api/admin/members/[userId] | GET | SP+ | users, user_stats, xp_ledger, evaluations, votes | — | Full profile for a single member |
| /api/admin/members/[userId]/role | PATCH | SA only | — | users | Change a member's role |

### Advancement Cycles

| Route | Method | Role | Reads | Writes |
| --- | --- | --- | --- | --- |
| /api/admin/cycles | GET | SP+ | advancement_cycles | — |
| /api/admin/cycles | POST | SA only | — | advancement_cycles |
| /api/admin/cycles/[id] | PATCH | SA only | — | advancement_cycles |

### Endorsements

| Route | Method | Role | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| /api/endorse/[token] | GET | Public | endorsements | — | Validate token + return subject's display name for the form |
| /api/endorse/[token] | POST | Public | — | endorsements | Submit endorsement |
| /api/admin/endorsements | GET | SP+ | endorsements | — | All endorsements pending review |
| /api/admin/endorsements/[id] | PATCH | SP+ | — | endorsements, xp_ledger | Verify endorsement + award XP |

---

## 5. Data Flow

### XP Calculation

XP is not calculated live on every page load. The architecture is:

1. Events happen (evaluation completed, event attended, vote received, endorsement verified)
2. An API route writes to `xp_ledger` immediately — this is the source of truth
3. `user_stats` is updated — either inline (for simple single-record events) or via the `/api/admin/xp/recompute` batch route (for cycle-close operations)
4. Dashboard reads from `user_stats` for totals — never recalculates from the ledger on every request

When to write to `xp_ledger` inline:
- `/api/dashboard/vote` POST — cross-node vote registered: write +XP to subject immediately
- `/api/admin/events/[id]/award-xp` POST — bulk award: write one ledger entry per confirmed attendee
- `/api/admin/endorsements/[id]` PATCH — verify endorsement: write +XP to subject
- `/api/admin/xp/award` POST — manual award: write directly

`user_stats` update pattern: After any `xp_ledger` write, the API route should either:
- Increment the relevant `user_stats` field in the same request (preferred, fast)
- Or mark `user_stats.last_computed_at` as stale, letting the next recompute fix it

Tier thresholds (open question — see §6): Tier advancement is checked during the cycle-close process or on any `user_stats` update — never in the render path.

### Vote Anonymization

The anonymization is entirely at the API layer, not the database layer:
- `votes` collection in PocketBase stores the full voter relation (non-anonymous at the DB level)
- PocketBase collection-level API rules must be configured to deny all direct client access to the `votes` collection
- `/api/dashboard/vote/summary` — queries PocketBase as admin, aggregates by `{ subject, cycle }`, returns `{ positive: N, negative: N }` — no voter field ever leaves the server
- `/api/dashboard/vote/eligible` — queries the votes to check what the user has already cast, but only for the `voter = current user` filter, so the user only sees their own votes
- `/api/admin/votes` — SP-only, returns full records including voter field

This means the security boundary is the Next.js API route layer, which is already the platform's stated architectural constraint.

### Advancement Cycle Process

The cycle is a manual, super-peer-triggered operation, not automated:

1. Super Peer creates a new cycle via `/api/admin/cycles` POST
2. The active cycle's status is set to `active`; the previous one to `closed`
3. During the cycle, XP accrues in `xp_ledger` and `user_stats` is kept in sync
4. At cycle close, Super Peer triggers `/api/admin/xp/recompute` POST — this is a full recalculate-and-write of all `user_stats` for the cycle
5. `user_stats.tier` is updated based on final XP vs. tier thresholds
6. The cycle is then set to `closed`

The recompute route should be idempotent — running it multiple times produces the same result. It reads all `xp_ledger` entries for the cycle and writes the aggregated `user_stats` fresh.

### Endorsement Public Flow

1. Super Peer generates an endorsement link for a member: a `public_token` UUID is stored in the `endorsements` collection with `verified = false`
2. The link `/endorse/[token]` is shared with the external endorser
3. The public page renders the member's display name (fetched via `/api/endorse/[token]` GET) and a form
4. Submission hits `/api/endorse/[token]` POST — creates or updates the `endorsements` record
5. Super Peer reviews via `/api/admin/endorsements` — verifies and triggers XP award

---

## 6. Product Decisions (resolved)

Resolved 16 August 2026 (task INFRA-01). Each decision records its source —
`argc-handbook` files are the club's authoritative docs; anything marked
**provisional** has a working assumption that the founder can revise without
schema changes. Decisions marked **locked** are settled.

1. **Q1 — Tier thresholds:** XP cutoffs per cycle are `TIER_THRESHOLDS` in
   `lib/constants.ts` — Initiate 0, Contributor 60, Architect 140, Vanguard 300.
   Calibrated against `XP_WEIGHTS` (a solid cycle ≈ 4 on-time evaluations +
   1 event + 1 session ≈ 165 XP → Architect). Source: handbook
   `03-protocols/03-advancement.md` — thresholds are deliberately **not**
   published in the handbook because they live on the member platform and are
   re-evaluated by Super Peers each cycle. Code constants, never schema.
   **Locked** (tunable per cycle in `constants.ts`).
2. **Q2 — Cross-node voting eligibility:** any member in the active cycle who
   is not in the voter's own node and has a `user_stats` row for the cycle
   (i.e., is an active, assigned member). No curated list beyond that.
   **Provisional** — the handbook's voting protocol covers structural votes,
   not this peer-recognition mechanism, so the founder should confirm.
3. **Q3 — Vote budget:** one positive + one negative per cycle per member
   (`VOTE_BUDGET` in `lib/constants.ts`). **Provisional.**
4. **Q4 — Stage 3 conductor:** `eval_plus_node_leader` is conducted by the
   evaluatee's own node leader. Stages 1–2 are assigned to peers within the
   evaluatee's node by the node leader. **Provisional.**
5. **Q5 — Endorsement link generation:** a Super Peer generates the public
   token from the admin panel (`endorsements` record with `verified = false`).
   Members cannot self-generate. Matches the flow in §5.
   **Locked.**
6. **Q6 — Evaluation score format:** numeric 0–100 with written feedback;
   pass = score ≥ 50 (`EVAL_PASS_SCORE`). The handbook (`01-evaluations.md`)
   mandates a score + written feedback but no scale, so the pass threshold is
   the working assumption. **Provisional** — founder to confirm rubric levels.
7. **Q7 — Missed evaluation:** a missed evaluation is a **zero-XP** event —
   no award, no negative XP. Late (notified ≥ 2h in advance) earns the reduced
   `evaluation_late` weight. Missed evaluations do not auto-block tier
   advancement, but 3+ missed in a cycle flags the member for review. Source:
   handbook `03-protocols/01-evaluations.md` (missing without notice is "a
   failure of commitment"). **Provisional.**
8. **Q8 — super_admin_peer vs super_peer:** `super_admin_peer` is an internal
   platform elevation of `super_peer`, scoped to destructive/irreversible
   operations only: cycle create/open/close, member role changes, XP recompute,
   vote deletion. Everything else a Super Peer can do. The handbook defines
   three club roles; this fourth is platform plumbing.
   **Locked.**
9. **Q9 — Public /events page:** rebuild it data-driven from the `events`
   collection (`is_public = true`) when the public events page is rebuilt —
   **not** part of the dashboard scope. Tracked as its own follow-up issue.
   The V2 page does not exist yet, so it will be built data-driven from the
   start. **Locked.**
10. **Q10 — Dashboard navbar:** no public navbar on dashboard pages.
    `DashboardSidebar` is the sole navigation; `DashboardHeader` carries the
    mono page title and breadcrumbs. Matches the §3 component inventory.
    **Locked.**
