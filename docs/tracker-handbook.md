# GBSC Handbook Tracker
# tracker-handbook.md
#
# Architecture: GitHub repo folders → platform sections (zero-deploy)
# Repo: github.com/ARGCoders/argc-handbook
# Platform: argc_platform /handbook (dynamic, 1hr cache)
# Owner: Ayham Abusninah (sole contributor)
#
# RULES OF ENGAGEMENT
# ───────────────────
# 1. One task = one commit. Commit message must reference the task ID.
#    Format: docs(handbook): HB-XXX <verb> <file>
# 2. Do not mark DONE until the .md is pushed to the repo and verified live on /handbook.
# 3. Do not mark REVIEWED until you have re-read the file at least 24h after writing it.
# 4. BLOCKED tasks must have a reason in the Notes column. Do not leave BLOCKED silent.
# 5. IN-PROGRESS = only one task at a time. Finish before picking up a new one.
# 6. Do not create a new folder in the repo without a corresponding row in this tracker first.
# 7. This file lives in argc_platform root. Update it in the same commit as the content.

---

## Legend

| Status      | Meaning                                                  |
|-------------|----------------------------------------------------------|
| TODO        | Not started                                              |
| IN-PROGRESS | Actively being worked on                                 |
| BLOCKED     | Cannot proceed — reason required in Notes                |
| DONE        | Pushed to repo, visible on platform                      |
| REVIEWED    | Re-read after 24h cooldown, content confirmed correct    |

---

## Phase 0 — Repo Architecture

> Goal: Lock the folder structure before writing any content.
> No .md files are created until all Phase 0 rows are DONE.

| ID     | Task                                                  | Status | Notes |
|--------|-------------------------------------------------------|--------|-------|
| HB-001 | Define final top-level folder list                    | DONE   | 01-company, 02-people finalized |
| HB-002 | Decide naming convention (NN-name prefix)             | DONE   | Numeric prefix controls sort order |
| HB-003 | Create 01-company/ folder in repo                     | DONE   |       |
| HB-004 | Create 02-people/ folder in repo                      | DONE   |       |
| HB-005 | Create 03-protocols/ folder in repo                   | DONE   |       |
| HB-006 | Create 04-ecosystem/ folder in repo                   | DONE   |       |
| HB-007 | Create 05-operations/ folder in repo                  | DONE   |       |
| HB-008 | Verify all folders appear as sections on /handbook    | DONE   | All 5 folders confirmed in repo; .gitkeep-only folders render as empty sections |

---

## Phase 1 — Scaffold Empty Files

> Goal: Create all .md files with only a title line (`# Title`). No body content yet.
> Purpose: unblocks the platform to render all topic links before writing begins.

### 01-company/

| ID     | File                        | Status | Notes |
|--------|-----------------------------|--------|-------|
| HB-011 | 01-company/01-mission.md       | DONE   |       |
| HB-012 | 01-company/02-vision.md        | DONE   |       |
| HB-013 | 01-company/03-values.md        | DONE   |       |
| HB-014 | 01-company/04-history.md       | DONE   |       |
| HB-015 | 01-company/05-structure.md     | DONE   |       |

### 02-people/

| ID     | File                           | Status | Notes |
|--------|--------------------------------|--------|-------|
| HB-021 | 02-people/01-who-we-are.md        | DONE   |       |
| HB-022 | 02-people/02-how-we-work.md       | DONE   |       |
| HB-023 | 02-people/03-membership.md        | DONE   |       |
| HB-024 | 02-people/04-roles-and-tiers.md   | DONE   |       |
| HB-025 | 02-people/05-onboarding.md        | DONE   |       |

### 03-protocols/

| ID     | File                                | Status | Notes |
|--------|-------------------------------------|--------|-------|
| HB-031 | 03-protocols/01-evaluations.md         | DONE   |       |
| HB-032 | 03-protocols/02-xp-system.md           | DONE   |       |
| HB-033 | 03-protocols/04-voting.md              | DONE   |       |
| HB-034 | 03-protocols/05-conflict-resolution.md | DONE   |       |
| HB-035 | 03-protocols/03-advancement.md         | DONE   |       |

### 04-ecosystem/

| ID     | File                               | Status | Notes |
|--------|------------------------------------|--------|-------|
| HB-041 | 04-ecosystem/01-nodes.md              | DONE   |       |
| HB-042 | 04-ecosystem/02-events.md             | DONE   |       |
| HB-043 | 04-ecosystem/03-knowledge-sessions.md | DONE   |       |
| HB-044 | 04-ecosystem/04-hackathons.md         | DONE   |       |
| HB-045 | 04-ecosystem/05-external-outreach.md  | DONE   |       |

### 05-operations/

| ID     | File                              | Status | Notes |
|--------|-----------------------------------|--------|-------|
| HB-051 | 05-operations/01-platform.md         | DONE   |       |
| HB-052 | 05-operations/03-communications.md   | DONE   |       |
| HB-053 | 05-operations/04-code-of-conduct.md  | DONE   |       |
| HB-054 | 05-operations/05-security.md         | DONE   |       |
| HB-055 | 05-operations/02-tooling.md          | DONE   |       |

---

## Phase 2 — First-Paragraph Summaries

> Goal: Each .md opens with one punchy paragraph (2–4 sentences max).
> This is what the platform extracts and shows as the topic summary on /handbook.
> Criterion: Summary must be visible and readable on /handbook before marking DONE.

| ID     | File                                | Status | Notes |
|--------|-------------------------------------|--------|-------|
| HB-111 | 01-company/01-mission.md               | DONE   |       |
| HB-112 | 01-company/02-vision.md                | DONE   |       |
| HB-113 | 01-company/03-values.md                | DONE   |       |
| HB-114 | 01-company/04-history.md               | DONE   |       |
| HB-115 | 01-company/05-structure.md             | DONE   |       |
| HB-121 | 02-people/01-who-we-are.md             | DONE   |       |
| HB-122 | 02-people/02-how-we-work.md            | DONE   |       |
| HB-123 | 02-people/03-membership.md             | DONE   |       |
| HB-124 | 02-people/04-roles-and-tiers.md        | DONE   |       |
| HB-125 | 02-people/05-onboarding.md             | DONE   |       |
| HB-131 | 03-protocols/01-evaluations.md         | DONE   |       |
| HB-132 | 03-protocols/02-xp-system.md           | DONE   |       |
| HB-133 | 03-protocols/04-voting.md              | DONE   |       |
| HB-134 | 03-protocols/05-conflict-resolution.md | DONE   |       |
| HB-135 | 03-protocols/03-advancement.md         | DONE   |       |
| HB-141 | 04-ecosystem/01-nodes.md               | DONE   |       |
| HB-142 | 04-ecosystem/02-events.md              | DONE   |       |
| HB-143 | 04-ecosystem/03-knowledge-sessions.md  | DONE   |       |
| HB-144 | 04-ecosystem/04-hackathons.md          | DONE   |       |
| HB-145 | 04-ecosystem/05-external-outreach.md   | DONE   |       |
| HB-151 | 05-operations/01-platform.md           | DONE   |       |
| HB-152 | 05-operations/03-communications.md     | DONE   |       |
| HB-153 | 05-operations/04-code-of-conduct.md    | DONE   |       |
| HB-154 | 05-operations/05-security.md           | DONE   |       |
| HB-155 | 05-operations/02-tooling.md            | DONE   |       |

---

## Phase 3 — Draft Core Content

> Goal: Full content for each file. Minimum viable structure:
> - Opening paragraph (done in Phase 2)
> - 2–4 h2 sections covering the topic completely
> - No padding, no filler — every sentence earns its place
> Criterion: File is complete and pushed before marking DONE.

| ID     | File                                | Status | Notes |
|--------|-------------------------------------|--------|-------|
| HB-211 | 01-company/01-mission.md               | DONE   |       |
| HB-212 | 01-company/02-vision.md                | DONE   |       |
| HB-213 | 01-company/03-values.md                | DONE   |       |
| HB-214 | 01-company/04-history.md               | DONE   |       |
| HB-215 | 01-company/05-structure.md             | DONE   |       |
| HB-221 | 02-people/01-who-we-are.md             | DONE   |       |
| HB-222 | 02-people/02-how-we-work.md            | DONE   |       |
| HB-223 | 02-people/03-membership.md             | DONE   |       |
| HB-224 | 02-people/04-roles-and-tiers.md        | DONE   |       |
| HB-225 | 02-people/05-onboarding.md             | DONE   |       |
| HB-231 | 03-protocols/01-evaluations.md         | DONE   |       |
| HB-232 | 03-protocols/02-xp-system.md           | DONE   |       |
| HB-233 | 03-protocols/04-voting.md              | DONE   |       |
| HB-234 | 03-protocols/05-conflict-resolution.md | DONE   |       |
| HB-235 | 03-protocols/03-advancement.md         | DONE   |       |
| HB-241 | 04-ecosystem/01-nodes.md               | DONE   |       |
| HB-242 | 04-ecosystem/02-events.md              | DONE   |       |
| HB-243 | 04-ecosystem/03-knowledge-sessions.md  | DONE   |       |
| HB-244 | 04-ecosystem/04-hackathons.md          | DONE   |       |
| HB-245 | 04-ecosystem/05-external-outreach.md   | DONE   |       |
| HB-251 | 05-operations/01-platform.md           | DONE   |       |
| HB-252 | 05-operations/03-communications.md     | DONE   |       |
| HB-253 | 05-operations/04-code-of-conduct.md    | DONE   |       |
| HB-254 | 05-operations/05-security.md           | DONE   |       |
| HB-255 | 05-operations/02-tooling.md            | DONE   |       |

---

## Phase 4 — Self Review

> Goal: Re-read each file at least 24h after writing it.
> Check: accuracy, completeness, tone (direct/precise, no fluff), platform rendering.
> Criterion: File reads clean with fresh eyes. Mark REVIEWED when done.

| ID     | File                                | Status | Notes |
|--------|-------------------------------------|--------|-------|
| HB-311 | 01-company/01-mission.md               | REVIEWED   |       |
| HB-312 | 01-company/02-vision.md                | REVIEWED   |       |
| HB-313 | 01-company/03-values.md                | REVIEWED   |       |
| HB-314 | 01-company/04-history.md               | REVIEWED   |       |
| HB-315 | 01-company/05-structure.md             | REVIEWED   |       |
| HB-321 | 02-people/01-who-we-are.md             | REVIEWED   |       |
| HB-322 | 02-people/02-how-we-work.md            | REVIEWED   |       |
| HB-323 | 02-people/03-membership.md             | REVIEWED   |       |
| HB-324 | 02-people/04-roles-and-tiers.md        | REVIEWED   |       |
| HB-325 | 02-people/05-onboarding.md             | REVIEWED   |       |
| HB-331 | 03-protocols/01-evaluations.md         | REVIEWED   |       |
| HB-332 | 03-protocols/02-xp-system.md           | REVIEWED   |       |
| HB-333 | 03-protocols/04-voting.md              | REVIEWED   |       |
| HB-334 | 03-protocols/05-conflict-resolution.md | REVIEWED   |       |
| HB-335 | 03-protocols/03-advancement.md         | REVIEWED   |       |
| HB-341 | 04-ecosystem/01-nodes.md               | REVIEWED   |       |
| HB-342 | 04-ecosystem/02-events.md              | REVIEWED   |       |
| HB-343 | 04-ecosystem/03-knowledge-sessions.md  | REVIEWED   |       |
| HB-344 | 04-ecosystem/04-hackathons.md          | REVIEWED   |       |
| HB-345 | 04-ecosystem/05-external-outreach.md   | REVIEWED   |       |
| HB-351 | 05-operations/01-platform.md           | REVIEWED   |       |
| HB-352 | 05-operations/03-communications.md     | REVIEWED   |       |
| HB-353 | 05-operations/04-code-of-conduct.md    | REVIEWED   |       |
| HB-354 | 05-operations/05-security.md           | REVIEWED   |       |
| HB-355 | 05-operations/02-tooling.md            | TODO   |       |

---

## Progress Snapshot

> Update these counts manually at the start of each writing session.

| Phase                    | Total | DONE | REVIEWED | Remaining |
|--------------------------|-------|------|----------|-----------|
| Phase 0 — Architecture   | 8     | 8    | —        | 0         |
| Phase 1 — Scaffold       | 25    | 25   | —        | 0         |
| Phase 2 — Summaries      | 25    | 25   | —        | 0         |
| Phase 3 — Draft Content  | 25    | 25   | —        | 0         |
| Phase 4 — Self Review    | 25    | 0    | 0        | 25        |

---

## Commit Convention

```
docs(handbook): HB-XXX <verb> <file>

Examples:
  docs(handbook): HB-005 create 03-protocols folder
  docs(handbook): HB-023 scaffold membership.md
  docs(handbook): HB-123 write summary for membership.md
  docs(handbook): HB-223 draft membership.md content
  docs(handbook): HB-323 self-review membership.md
```

## Grep Cheatsheet

```bash
# Show all TODO tasks
grep "TODO" tracker-handbook.md

# Show all BLOCKED tasks
grep "BLOCKED" tracker-handbook.md

# Show all TODO tasks in Phase 3 (HB-2xx)
grep "HB-2" tracker-handbook.md | grep "TODO"

# Show all files not yet REVIEWED
grep "HB-3" tracker-handbook.md | grep "TODO"

# Show current IN-PROGRESS task
grep "IN-PROGRESS" tracker-handbook.md
```
