<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Platform Architecture

This platform consists of three layers:

## frontend
The user-facing application. **Never communicates directly with PocketBase.** All requests to the backend must go through the Next.js proxy backend.

## backend (Next.js)
Acts as a proxy/API layer between the frontend and PocketBase. All frontend requests to PocketBase must be routed through here for security reasons. This is the only layer allowed to talk to `backend-main`.

## backend-main (PocketBase)
The primary data store and auth backend, hosted at:
```
https://pocketbase-production-59e1.up.railway.app
```
Only the Next.js backend communicates with this service directly. The frontend must never call this URL.

# Dashboard Conventions

Before implementing anything under `/dashboard`, `/api/dashboard`, or `/api/admin`, read `docs/DASHBOARD_CONTRACT.md` (INFRA-09) — it defines the API response envelope, error codes, component ownership map (Role 2 owns shared components, Roles 3/4 own feature components), and ledger write rules. Routes not in `docs/PLATFORM.md` §4 do not exist; pages not in §2 do not exist.

# Commit Message Standard

Follow [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <short description>
```

## Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Maintenance tasks, dependency updates, tooling |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semicolons, etc. — no logic change |
| `refactor` | Code change that is neither a fix nor a feature |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverts a previous commit |

## Examples

```
feat(auth): add login with Google
fix(api): handle missing token in proxy middleware
chore(deps): upgrade next to v15.2
docs(readme): update setup instructions
refactor(db): extract PocketBase client into shared util
```

## Rules
- Use the imperative mood in the description: "add" not "added" or "adds"
- Keep the subject line under 72 characters
- Scope is optional but recommended — use the layer or module name (`frontend`, `backend`, `auth`, `api`, etc.)
- Do not end the subject line with a period

## Commit Granularity

**No giant commits.** One task = one PR, but a PR should contain multiple
focused commits — not one monolithic blob. Split commits by logical unit:

- Route implementation → 1 commit
- Tests for that route → separate commit(s)
- Fixes and refactors → their own commits
- Schema changes → their own commit (must include both `setup-collections.mjs` and `types/pocketbase.ts`)

If a commit touches more than ~200 lines or mixes unrelated concerns, split it.
The exception: a route and its tests are tightly coupled — if splitting them
would leave the build or test suite broken, keep them together in one commit.
