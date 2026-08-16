#!/usr/bin/env bash
#
# ARGC Platform V2 — GitHub project board setup (Scrum Master runbook).
#
# Creates, in order:
#   1. 4 milestones (Week 1–4, Aug 16 – Sep 15)
#   2. Role / priority / status labels
#   3. All 47 backlog issues (INFRA-01…09, UI-01…13, MEMBER-01…14, ADMIN-01…11)
#      with DoD + dependency notes in the body, role label, priority, milestone,
#      and assignee.
#
# Idempotent: safe to re-run. Existing milestones, labels and issues are skipped.
#
# Usage:
#   bash scripts/github-board-setup.sh
#
# Before running:
#   gh auth login
#   Edit the ASSIGNEE_* variables below (only the lead is pre-filled).
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
# Override the repo with:  ARGC_REPO="owner/repo" bash scripts/github-board-setup.sh
REPO="${ARGC_REPO:-ARGCoders/argc-platform-v2}"

ASSIGNEE_LEAD="AyhamAbusninah"   # Role 1 — Ayham, Project Lead
# Roles 2-4 default to the lead until the collaborator mapping is known.
# Reassign later with: gh issue edit <id> --add-assignee <handle>
ASSIGNEE_UI="${ASSIGNEE_UI:-AyhamAbusninah}"         # Role 2 — Frontend & Landing
ASSIGNEE_MEMBER="${ASSIGNEE_MEMBER:-AyhamAbusninah}" # Role 3 — Dashboard Member & Node
ASSIGNEE_ADMIN="${ASSIGNEE_ADMIN:-AyhamAbusninah}"   # Role 4 — Dashboard Admin

# ─── Guards ─────────────────────────────────────────────────────────────────

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login"
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Repo $REPO not found or no access. Set ARGC_REPO=owner/repo to override."
  exit 1
fi

# ─── Helpers ────────────────────────────────────────────────────────────────

issue_exists() {
  gh issue list --repo "$REPO" --state all --limit 200 --json title \
    --jq '.[].title' 2>/dev/null | grep -qxF "$1"
}

ensure_milestone() {
  local title="$1" due="$2"
  if gh api "repos/$REPO/milestones?state=all" --jq '.[].title' 2>/dev/null \
    | grep -qxF "$title"; then
    echo "  = milestone exists: $title"
  else
    gh api "repos/$REPO/milestones" \
      -f title="$title" \
      -f state="open" \
      -f description="$title — see docs/PROJECT_STATUS.md for context" \
      -f due_on="${due}T23:59:59Z" >/dev/null
    echo "  + milestone created: $title"
  fi
}

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if gh label view "$name" --repo "$REPO" >/dev/null 2>&1; then
    echo "  = label exists: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
    echo "  + label created: $name"
  fi
}

# create_issue ID TITLE BODY PRIORITY MILESTONE ROLE_LABEL ASSIGNEE
create_issue() {
  local id="$1" title="$2" body="$3" priority="$4"
  local milestone="$5" role_label="$6" assignee="$7"
  local full_title="[$id] $title"

  if issue_exists "$full_title"; then
    echo "  = [$id] issue exists"
    return
  fi

  echo "  + creating [$id]"
  gh issue create --repo "$REPO" \
    --title "$full_title" \
    --body "$body" \
    --label "$role_label" \
    --label "$priority" \
    --milestone "$milestone" \
    --assignee "$assignee"
}

# ─── Step 1: Milestones ─────────────────────────────────────────────────────

echo "== Milestones =="
ensure_milestone "Week 1: Foundations"        "2026-08-23"
ensure_milestone "Week 2: Reads & Shell"      "2026-08-31"
ensure_milestone "Week 3: Writes & Logic"     "2026-09-07"
ensure_milestone "Week 4: Integration & QA"   "2026-09-15"

# ─── Step 2: Labels ─────────────────────────────────────────────────────────

echo "== Labels =="
ensure_label "role:infra"   "5319E7" "Role 1 — Ayham: schema, proxy, seed, docs, deploy"
ensure_label "role:ui"      "1D76DB" "Role 2 — Frontend & Landing: UI only, no API/db logic"
ensure_label "role:member"  "0E8A16" "Role 3 — Dashboard Member & Node features"
ensure_label "role:admin"   "B60205" "Role 4 — Dashboard Admin / Super Peer features"
ensure_label "status:blocked" "000000" "Blocked — reason must be in a comment"
ensure_label "priority:high"   "D93F0B" "Critical path / unblocks others"
ensure_label "priority:medium" "FBCA04" "Normal"
ensure_label "priority:low"    "6E5494" "Polish / non-critical"

# ─── Step 3: Issues — Role 1 (INFRA) ────────────────────────────────────────

echo "== Issues: INFRA (Role 1 — Ayham) =="

create_issue "INFRA-01" "Decide Q1–Q10 product questions" \
"Resolve the 10 open product questions in PLATFORM.md §6. Record a decision and rationale for each; commit tier thresholds (Q1) to lib/constants.ts. Without thresholds the XpBar and recompute engine cannot be built.

DoD: All 10 questions answered in PLATFORM.md, thresholds exported from constants.ts, team notified in the issue.

Blocked-by: none | Blocks: UI-06, ADMIN-01, MEMBER-12" \
"priority:high" "Week 1: Foundations" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-02" "Lock collection API rules" \
"Extend ensureCollection in scripts/setup-collections.mjs to set listRule/viewRule/createRule/updateRule/deleteRule. votes = deny all direct client access (anonymization boundary, PLATFORM §5); endorsements = public create keyed by token + admin view; events = is_public view; xp_ledger / user_stats / node_member = admin-only.

DoD: make db-setup idempotent, votes unreachable from a user-scoped client, rules documented in script header.

Blocked-by: none | Blocks: MEMBER-01/02/09/12, ADMIN-03/06/08/09/10" \
"priority:high" "Week 1: Foundations" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-03" "Role-aware proxy gating" \
"Extend proxy.ts: /dashboard root redirects by role (node_peer → /dashboard/overview, node_leader → /dashboard/node, super_peer → /dashboard/admin); redirect too-low roles away from /dashboard/admin* and /dashboard/node* to their role home. Coarse cookie check only — server-side requireRole remains the authorization boundary.

DoD: Redirect rules covered by tests, verified against a running server.

Blocked-by: none | Blocks: every /dashboard route in Roles 3/4" \
"priority:high" "Week 1: Foundations" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-04" "Dev seed script" \
"Write scripts/seed-dev.mjs: one user per role, 2 nodes with members, a node leader, one active advancement cycle, xp_ledger + user_stats rows, an event with attendance, evaluations at each stage, votes, one endorsement with a public token.

DoD: pnpm db:seed populates a clean local DB, idempotent, documented in README.

Blocked-by: none | Blocks: every Role 3/4 read view (nothing renders without rows)" \
"priority:high" "Week 1: Foundations" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-05" "Handbook Phase 4 self-review" \
"Complete tracker-handbook.md Phase 4: re-read HB-311…355 (24h cooldown per file), check accuracy/completeness/tone/platform rendering, mark REVIEWED. One commit per task: docs(handbook): HB-XXX <verb> <file>.

DoD: All 25 rows REVIEWED, progress snapshot updated.

Blocked-by: none" \
"priority:medium" "Week 3: Writes & Logic" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-06" "lib/xp.ts award contract" \
"Define and stub the single ledger-write helper awardXp(user, amount, category, referenceId, referenceType, cycle, awardedBy?) in lib/xp.ts. All XP writes across Roles 3/4 must go through it so vote/event/eval/endorsement awards share one path and user_stats update pattern.

DoD: Interface frozen in code, unit tests, documented for Roles 3/4.

Blocked-by: none | Blocks: MEMBER-09/12, ADMIN-01/02/05/07/08" \
"priority:high" "Week 1: Foundations" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-07" "Deploy PocketBase to Railway" \
"Move the backend to a teammate's Railway account (current one hit the free-plan resource limit). Run pb-provision + pb-deploy + pb-restore, repoint NEXT_PUBLIC_POCKETBASE_URL. Volume at /pb_data is not optional.

DoD: /api/health returns 200 on the prod URL, volume mounted, data restored from local pb_data.

Blocked-by: external (Railway account access)" \
"priority:medium" "Week 2: Reads & Shell" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-08" "E2E harness + dashboard smoke tests" \
"Add Playwright E2E covering the 4 core flows: login → overview, node leader eval scheduling, super peer recompute, public endorsement submission. Wire into CI.

DoD: Suite green in CI, all 4 flows covered, make check still passes.

Blocked-by: INFRA-03, ADMIN-01, ADMIN-08" \
"priority:low" "Week 4: Integration & QA" "role:infra" "$ASSIGNEE_LEAD"

create_issue "INFRA-09" "Dashboard team contract docs" \
"Update AGENTS.md/docs with dashboard conventions: API response shape, error handling, component ownership map (Role 2 owns shared components, 3/4 own feature components), ledger write rules.

DoD: Roles 3/4 can implement without cross-questioning the team.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:infra" "$ASSIGNEE_LEAD"

# ─── Step 3: Issues — Role 2 (UI) ───────────────────────────────────────────

echo "== Issues: UI (Role 2 — Frontend & Landing) =="

create_issue "UI-01" "Landing page redesign" \
"Design and build the new landing sections (mission/values, nodes, events/handbook preview, register CTA). All copy in content/landing.json — no hardcoded strings. Old sections stay removed.

DoD: Sections render, content-driven, responsive, WCAG-checked, navbar variants correct, make check green.

Blocked-by: none" \
"priority:high" "Week 1: Foundations" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-02" "DashboardShell" \
"Navy layout wrapper for all dashboard routes: DashboardSidebar + main content area, responsive sidebar collapse. eng-navy background.

DoD: Renders children, collapses below md breakpoint, colocated test.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-03" "DashboardSidebar" \
"Left nav rail: avatar, display name, RoleBadge, nav links filtered by the user's role via useAuth(). Collapsible on mobile.

DoD: Links filtered per role, collapse works, test.

Blocked-by: UI-08 (RoleBadge)" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-04" "DashboardHeader" \
"Top bar within the content area: mono page title, breadcrumb, optional actions slot. Compose the existing Breadcrumb component.

DoD: Renders title + breadcrumb + slot, test.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-05" "RoleGate wrapper" \
"Renders children only if the current user's role meets a minimum threshold (roleAtLeast from lib/constants). For conditional sections inside shared pages.

DoD: Works with useAuth, test.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-06" "XpBar component" \
"Horizontal progress bar toward the next tier threshold. Mono label shows current / required XP. Zero border-radius, argc-maroon fill.

DoD: Correct fill %, renders at 0 and unknown XP, test.

Blocked-by: INFRA-01 (tier thresholds)" \
"priority:high" "Week 1: Foundations" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-07" "TierBadge component" \
"Chip showing tier (Initiate, Contributor, Architect, Vanguard). Hard edges, IBM Plex Mono, uppercase.

DoD: All 4 tiers render, test.

Blocked-by: none" \
"priority:high" "Week 1: Foundations" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-08" "RoleBadge component" \
"Chip showing member role, same spec as TierBadge. All 5 roles from types/pocketbase.ts.

DoD: All 5 roles render, test.

Blocked-by: none" \
"priority:high" "Week 1: Foundations" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-09" "StatusChip component" \
"Reusable status indicator. Variants: pending, scheduled, completed, missed, approved, rejected, proposed. Hard edges, mono text, zero radius. Consistent across evaluations, events, endorsements.

DoD: Variant map complete, test.

Blocked-by: none" \
"priority:high" "Week 1: Foundations" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-10" "StatCard component" \
"Single metric: large number + label + optional delta. Flat on navy, no shadows.

DoD: Renders with/without delta, test.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-11" "XpLedgerTable + LoadingRow" \
"Paginated XP ledger table: date, category, amount, source. Mono for amounts and dates, bordered-row pattern. LoadingRow = skeleton row matching bordered-row height. Reuse shadcn Table and shared Skeletons.

DoD: Renders rows + skeleton + empty state, tests.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-12" "CycleSelector component" \
"Dropdown or segmented control to switch between advancement cycles. Used on XP and evaluation pages.

DoD: Options render, selection callback, test.

Blocked-by: none" \
"priority:medium" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

create_issue "UI-13" "Update COMPONENTS.md" \
"Document every new component from UI-02…12: file path, props, behaviour. Add a row for each.

DoD: Every new component has a row, no stale entries.

Blocked-by: UI-02, UI-03, UI-04, UI-05, UI-10, UI-11, UI-12" \
"priority:low" "Week 2: Reads & Shell" "role:ui" "$ASSIGNEE_UI"

# ─── Step 3: Issues — Role 3 (MEMBER) ───────────────────────────────────────

echo "== Issues: MEMBER (Role 3 — Dashboard Member & Node) =="

create_issue "MEMBER-01" "GET /api/dashboard/me/stats" \
"Return the authenticated user's current-cycle user_stats plus the active advancement cycle. Auth via requireRole('node_peer'). Read-only, no live XP calculation.

DoD: M+, correct payload, tests, make check green.

Blocked-by: INFRA-02, INFRA-04" \
"priority:high" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-02" "GET /api/dashboard/me/xp" \
"Paginated XP ledger history for the authenticated user. Query params: cycle, page, limit.

DoD: Pagination + cycle filter, tests.

Blocked-by: INFRA-02, INFRA-04" \
"priority:high" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-03" "/dashboard/overview page" \
"Personal summary: XP total + tier + cycle progress (XpBar), evaluation status, upcoming events, node name. Server component; EmptyState for missing data.

DoD: Renders from MEMBER-01 data, empty states, tests.

Blocked-by: UI-06, MEMBER-01, INFRA-04" \
"priority:high" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-04" "/dashboard/xp page" \
"Full XP history: XpLedgerTable, XP breakdown by category, CycleSelector.

DoD: Renders from MEMBER-02, empty state, tests.

Blocked-by: UI-11, UI-12, MEMBER-02" \
"priority:medium" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-05" "Events API + RSVP" \
"GET /api/dashboard/events (events relevant to the user: attending + upcoming public) and POST /api/dashboard/events/[id]/rsvp (writes event_attendance). Prevent duplicate RSVPs.

DoD: Idempotent RSVP, no duplicates, tests.

Blocked-by: INFRA-04" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-06" "/dashboard/events page" \
"Upcoming events + events the user attends/organizes, RSVP button wired to MEMBER-05. StatusChip for event status.

DoD: RSVP flow works, StatusChip used, tests.

Blocked-by: MEMBER-05, UI-09" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-07" "GET /api/dashboard/node/me" \
"Return the caller's current node and its members (with user expand, tier, eval status).

DoD: M+, tests.

Blocked-by: INFRA-02, INFRA-04" \
"priority:high" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-08" "/dashboard/node page" \
"Node overview: node name, cohort, node leader, member list with TierBadge + evaluation status (StatusChip).

DoD: Renders from MEMBER-07, tests.

Blocked-by: UI-07, UI-09, MEMBER-07" \
"priority:medium" "Week 2: Reads & Shell" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-09" "NL eval API + schedule form" \
"GET /api/dashboard/node/evaluations (all evals for the caller's node) and PATCH /api/dashboard/node/evaluations/[id] (schedule, mark complete, update score). Build EvaluationScheduleForm and EvaluationPipelineCard. Ledger writes via lib/xp.ts.

DoD: NL+, stage/status transitions validated, tests.

Blocked-by: INFRA-02, INFRA-06, UI-09" \
"priority:high" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-10" "/dashboard/node/members page" \
"Full member table for the leader's node: XP per member, evaluation stage, attendance record. NodeMemberRow component.

DoD: NL+, tests.

Blocked-by: MEMBER-07" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-11" "/dashboard/node/evaluations page" \
"Manage the node's evaluation schedule: assign evaluators, mark completions, flag issues. Wired to MEMBER-09 API.

DoD: NL+, schedule + complete flows, tests.

Blocked-by: MEMBER-09" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-12" "Vote API + VoteCastForm" \
"GET /api/dashboard/vote/eligible, /vote/my-votes, /vote/summary (aggregate counts only — never voter IDs), POST /api/dashboard/vote (validates cross-node, one positive/negative per cycle, cycle active; ledger write via lib/xp.ts). Build VoteCastForm with confirmation step.

DoD: M+, anonymous to members, one +/− per cycle enforced, tests.

Blocked-by: INFRA-01 (Q3 vote budget), INFRA-02, INFRA-06" \
"priority:high" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-13" "/dashboard/vote + /dashboard/evaluations pages" \
"Vote page (VoteCastForm + own votes this cycle) and the member's own evaluation history (GET /api/dashboard/me/evaluations, 3 stages per cycle with EvaluationStageRow).

DoD: Both pages render, tests.

Blocked-by: MEMBER-12, UI-09" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

create_issue "MEMBER-14" "Event propose (NL+)" \
"GET/POST /api/dashboard/node/events and EventProposeForm (title, type, description, proposed dates, location). Reuse Field/FieldArea primitives.

DoD: NL+, event lands as status=proposed, tests.

Blocked-by: INFRA-04, UI-09" \
"priority:medium" "Week 3: Writes & Logic" "role:member" "$ASSIGNEE_MEMBER"

# ─── Step 3: Issues — Role 4 (ADMIN) ────────────────────────────────────────

echo "== Issues: ADMIN (Role 4 — Dashboard Admin) =="

create_issue "ADMIN-01" "POST /api/admin/xp/recompute" \
"Idempotent recompute engine: reads all xp_ledger entries for a cycle, rebuilds user_stats fresh, assigns tier from thresholds. SA only. Running twice yields the same result.

DoD: Idempotency proven by test, SA gate, make check green.

Blocked-by: INFRA-01 (tier thresholds), INFRA-06, INFRA-02" \
"priority:high" "Week 3: Writes & Logic" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-02" "Manual XP award + form" \
"POST /api/admin/xp/award (manual ledger write via lib/xp.ts) plus XpAwardForm and MemberSearchCombobox (autocomplete member select). SP only.

DoD: SP+, award lands in ledger + user_stats, tests.

Blocked-by: INFRA-06" \
"priority:high" "Week 3: Writes & Logic" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-03" "Members admin API" \
"GET /api/admin/members (filters: node, tier, role, search) and GET /api/admin/members/[userId] (full profile: stats, ledger, evaluations, votes, endorsements).

DoD: SP+, filters work, tests.

Blocked-by: INFRA-02, INFRA-04" \
"priority:high" "Week 2: Reads & Shell" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-04" "/dashboard/admin + member views" \
"Admin overview (all node statuses, current cycle progress, pending approvals count) + member directory + individual member detail pages wired to ADMIN-03.

DoD: SP+, renders real data, empty states, tests.

Blocked-by: UI-02, UI-03, UI-04, UI-05, UI-10, ADMIN-03" \
"priority:medium" "Week 2: Reads & Shell" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-05" "Evaluation pipeline admin" \
"GET /api/admin/evaluations (all nodes, filterable) + PATCH /api/admin/evaluations/[id] (full update + trigger XP award via lib/xp.ts) + /dashboard/admin/evaluations view with admin EvaluationPipelineCard.

DoD: SP+, XP awarded once, tests.

Blocked-by: INFRA-02, INFRA-06" \
"priority:medium" "Week 3: Writes & Logic" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-06" "Votes admin API + view" \
"GET /api/admin/votes (full records, voter identity revealed) + DELETE /api/admin/votes/[id] (remove fraudulent votes) + /dashboard/admin/votes view. SP only.

DoD: SP+, de-anonymized view, tests.

Blocked-by: INFRA-02, UI-09" \
"priority:low" "Week 4: Integration & QA" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-07" "Events admin + XP award" \
"GET /api/admin/events + PATCH /api/admin/events/[id] (approve, mark completed, attendance count) + POST /api/admin/events/[id]/award-xp (bulk ledger write per confirmed attendee via lib/xp.ts) + /dashboard/admin/events view.

DoD: SP+, bulk award idempotent, tests.

Blocked-by: INFRA-04, INFRA-06" \
"priority:medium" "Week 3: Writes & Logic" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-08" "Endorsements public + admin" \
"Public /endorse/[token] page with EndorsementForm + GET/POST /api/endorse/[token] (token validates, creates/updates record). Admin side: GET /api/admin/endorsements + PATCH /api/admin/endorsements/[id] (verify + award XP via lib/xp.ts) + /dashboard/admin/endorsements view.

DoD: Public flow works without auth, verification awards XP once, tests.

Blocked-by: INFRA-01 (Q5 token flow), INFRA-02, INFRA-06" \
"priority:low" "Week 4: Integration & QA" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-09" "Nodes admin API + view" \
"GET /api/admin/nodes + POST /api/admin/nodes + PATCH /api/admin/nodes/[id] (update, assign leader, add/remove members) + /dashboard/admin/nodes view.

DoD: SP+, tests.

Blocked-by: INFRA-02, INFRA-04" \
"priority:medium" "Week 2: Reads & Shell" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-10" "Cycles admin API + view" \
"GET /api/admin/cycles + POST /api/admin/cycles (SA) + PATCH /api/admin/cycles/[id] (SA: open, close) + /dashboard/admin/cycles view.

DoD: SA gate on mutations, tests.

Blocked-by: INFRA-02" \
"priority:medium" "Week 4: Integration & QA" "role:admin" "$ASSIGNEE_ADMIN"

create_issue "ADMIN-11" "Role change API (SA)" \
"PATCH /api/admin/members/[userId]/role — change a member's role. SA only. Must keep pb_role cookie semantics in mind (V1 already refreshes it on /api/auth/me).

DoD: SA gate, test.

Blocked-by: INFRA-02" \
"priority:medium" "Week 3: Writes & Logic" "role:admin" "$ASSIGNEE_ADMIN"

# ─── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "Board setup complete."
echo "  Milestones: gh milestone list --repo $REPO"
echo "  Labels:     gh label list --repo $REPO"
echo "  Issues:     gh issue list --repo $REPO"
echo "  Board view: gh issue list --repo $REPO --milestone \"Week 1: Foundations\""
