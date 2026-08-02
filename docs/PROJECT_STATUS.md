# Project status

Where the V2 rebuild stands, what was decided and why, and what to pick up next.

Read this first if you are joining. `README.md` tells you how to run it,
`ARCHITECTURE.md` how the code is organised, `COMPONENTS.md` what already exists. This
file tells you **what state the project is in and which decisions are already settled**,
so nobody re-litigates a question that has an answer or rebuilds something that exists.

_Last updated: 2 August 2026._

---

## In one paragraph

V2 is a rebuild of `argc_platform`. The engineering environment is finished — formatter,
tests, hooks, CI, and a reproducible backend. The **public UI is deliberately not built**:
only the hero and navbar exist, because the design is being reworked and building against
the old design twice would be waste. The next real work is the UI redesign.

---

## What is done

| Area               | State                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| Scaffold           | Next.js 16, TypeScript strict, Tailwind v4, shadcn rethemed to ARGC           |
| Design system      | `app/globals.css` — ARGC palette, square corners, WCAG-checked contrast       |
| Auth               | Full 42 Intra OAuth: login, callback, logout, session refresh, `AuthProvider` |
| Route gating       | `proxy.ts`, all three rules verified against a running server                 |
| Component library  | 18 modules, themed and accessible — see `COMPONENTS.md`                       |
| Tests              | Vitest + Testing Library, 51 tests                                            |
| CI                 | GitHub Actions: format, lint, typecheck, test, build                          |
| Commit hygiene     | Prettier, husky, lint-staged, commitlint                                      |
| Backend schema     | `scripts/setup-collections.mjs` — 17 collections, idempotent                  |
| Local backend      | `make db` runs PocketBase on `:8090`                                          |
| Deployable backend | `pocketbase/` — Dockerfile, entrypoint, Railway config                        |

## What is not done

| Area             | State                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Landing page     | **Hero only.** Vision, about and contact were removed pending the redesign           |
| Blog             | Removed. Was fully working — components, pages, four API routes, sanitised rendering |
| Events           | Removed. Was reading the PocketBase `events` collection                              |
| Handbook         | Removed. Was rendering markdown from the `argc-handbook` repo with 1h ISR            |
| Registration     | Removed. Was writing to `submissions`                                                |
| Dashboard        | Never started                                                                        |
| Deployed backend | Blocked — see below                                                                  |

Everything in that first block was built, worked, and was rolled back **on purpose**. The
code is in git history at `efefd73^` if it is useful as reference — but it was written
against the old design, so treat it as a reference, not something to restore.

---

## Decisions already made

Do not spend time re-deciding these. Each was checked against the code or the docs, not
assumed.

| Decision                                          | Why                                                                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 16, not 15**                            | The master plan says pin 15 "not 16". The stack is 16 and `AGENTS.md` mandates reading the shipped docs. C1 (async request APIs) still applies.                                                      |
| **`proxy.ts`, not `middleware.ts`**               | Next 16 renamed the convention and deprecated `middleware`. The plan calls `proxy.ts` a bug; it is the opposite. Verified: the build reports `Proxy (Middleware)` and all three redirect rules fire. |
| **Content lives in `content/*.json`**             | So copy edits never touch a component. Typed, so a bad edit fails the build.                                                                                                                         |
| **ASCII frames are a static asset, not a module** | Importing them cost **18.4 MB** of JavaScript in V1. Largest chunk now is 0.22 MB.                                                                                                                   |
| **shadcn adopted, rethemed**                      | Accessible primitives without the stock look `PRODUCT.md` rejects.                                                                                                                                   |
| **Cool neutral base, not warm cream**             | V1's `#FAF8F2` cast a sepia tint over every page.                                                                                                                                                    |
| **Dashboard is admin-only**                       | `PLATFORM.md` specifies member routes too, but those depend on ten unanswered product questions (`PLATFORM.md` §6).                                                                                  |

### Three claims in the old docs are wrong

`V2_MASTER_PLAN.md`, `SYSTEM_ARCHITECTURE.md` and `PLATFORM.md` predate this repo. Three
of their assertions were checked and are false — full detail in `ARCHITECTURE.md`:

1. Pin Next 15 "not 16" — the stack is 16.
2. `proxy.ts` is broken and route gating does not work — it works.
3. `pb_role` goes stale after a role change — V1 already refreshed it.

Treat those documents as **product intent, not technical instruction**.

---

## Known blockers

### The backend is not deployed

`pocketbase-production-59e1.up.railway.app` returns `404 Application not found`. Neither
Railway project contains a PocketBase service — it was created by hand in a dashboard, so
nothing in git could recreate it, and when it went it went completely.

`pocketbase/` now fixes the reproducibility half. The remaining blocker is the account:

```
Free plan resource provision limit exceeded
```

A service and volume **can** be created on that plan, but builds fail at scheduling with
no output. The image itself is fine — it builds and serves locally, `db:setup` populates
it, and the data survives a restart. Deployment is moving to a teammate's account.

Whoever deploys: **the volume at `/pb_data` is not optional.** Without it the database is
wiped on every deploy. `make pb-deploy` warns, but cannot stop you.

### The only copy of the data is local

The deployed volume died with the service. The surviving copy is the local `pb_data` on
Ayham's machine, served at `:8090`. Until the backend is redeployed and `make pb-restore`
has run, **that directory is the database.** Do not delete it.

---

## Working agreements

- **`make check` before you push.** Same sequence as CI, so a failure is local and fast
  rather than remote and slow.
- **Conventional Commits, enforced.** `feat(scope): imperative subject`, 72 characters
  max, no trailing period. The hook rejects anything else — it has already rejected a
  commit for being four characters too long.
- **Do not fight the formatter.** Prettier owns style. A pre-commit hook formats staged
  files.
- **Check `COMPONENTS.md` before writing a component.** Most of what a page needs exists.
- **One pnpm version for everyone**, pinned by `packageManager` in `package.json`. CI
  reads the same field. If your pnpm differs, run `corepack use pnpm` rather than
  changing the pin.
- **Never commit `.env`, `backups/` or `pb_data`.** All ignored; keep it that way.
- **Schema changes go in `scripts/setup-collections.mjs` and `types/pocketbase.ts` in the
  same commit.** The script is the source of truth, not the admin UI — editing schema
  through the dashboard is how the last backend became unreproducible.

---

## What to pick up next

In rough order.

1. **The UI redesign.** Everything else waits on it. Landing sections, then blog, events,
   handbook, registration. The API routes and data shapes for all four are in git history
   and can be lifted; the components should be written fresh.
2. **Deploy PocketBase** on an account without the quota limit, then `make pb-restore` to
   carry the local data across, then repoint `NEXT_PUBLIC_POCKETBASE_URL`.
3. **Deploy the frontend.** V1's `deploy.yml` (`railway up` on green CI) is a working
   starting point; it was deliberately not carried over.
4. **The dashboard**, once `PLATFORM.md` §6 has answers.

### Good first tasks

- Add tests for `lib/auth.ts` — currently the least covered security-sensitive module.
- Fill in `COMPONENTS.md` props for anything you use and find under-documented.
- Answer any of the ten open questions in `PLATFORM.md` §6; each unblocks dashboard work.

---

## Getting set up

```bash
git clone git@github.com:ARGCoders/argc-platform-v2.git
cd argc-platform-v2
pnpm install
cp .env.example .env      # ask Ayham for values
make run                  # PocketBase + schema + Next.js
make check                # confirm your machine matches CI
```

If `make check` fails on a clean clone, that is a real bug — say so rather than working
around it.
