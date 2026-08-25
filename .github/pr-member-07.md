## `feat(api): add GET /api/dashboard/node/me` — MEMBER-07

Closes #<!-- issue number -->

### What

Adds the node roster endpoint that returns the caller's current node and its active members with per-member stats and evaluations.

### Route

`GET /api/dashboard/node/me` — requires `node_peer` or higher.

**Response shape:**

```json
{
  "data": {
    "node": { "id", "name", "slug", "cohort", "status" },
    "members": [
      {
        "user": { "id", "display_name", "avatar_url" },
        "role": "member" | "leader",
        "tier": "Contributor",
        "xp_total": 85,
        "evals": [{ "stage", "status", "score" }]
      }
    ]
  }
}
```

**Error envelopes:** `401 unauthorized`, `403 forbidden`, `404 not_found` (no active membership), `500 internal`.

### Behaviour

- Looks up the caller's active `node_member` row (`left_at = ""`). Missing → 404.
- Fetches the `node` record and all active members with `expand: user`.
- Finds the active `advancement_cycles` row (missing → zeroed stats, empty evals).
- Per member: fetches `user_stats` and `evaluations` for the active cycle. Missing stats → `tierForXp(0)` + `xp_total: 0`.
- User fields are projected — only `id`, `display_name`, `avatar_url` returned.
- Ownership-scoped: members of other nodes are unreachable.

### Commits

8 incremental commits, each verified standalone:

| #   | Commit                                                                | Scope                                |
| --- | --------------------------------------------------------------------- | ------------------------------------ |
| 1   | `feat(api): add node/me route skeleton with auth gate`                | File scaffold + auth                 |
| 2   | `test(api): add node/me auth gate tests`                              | 401 / 401 expired / 403 / 200 leader |
| 3   | `feat(api): add caller node membership lookup with 404`               | node_member query                    |
| 4   | `test(api): add node/me no-node 404 tests`                            | no membership + left membership      |
| 5   | `feat(api): load node record and active members with user projection` | node + members fetch                 |
| 6   | `test(api): add node/me member view and projection tests`             | view / projection / scoping          |
| 7   | `feat(api): add per-member stats, evals, and active cycle lookup`     | cycle + stats + evals                |
| 8   | `test(api): add node/me stats, cycle, and failure tests`              | zeroed stats / no cycle / PB 500     |

### Files

- `app/api/dashboard/node/me/route.ts` — handler (145 lines)
- `app/api/dashboard/node/me/route.test.ts` — 13 tests (623 lines)

### Checks

`pnpm lint` / `pnpm typecheck` / `pnpm test:run` — all green (148/148 tests, 0 errors).
