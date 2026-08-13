# ARGC Platform V2

The platform for **ARGC (Alliance of Resilient Giveback Coders)**, a production-oriented
engineering collective at 42 Amman. Public site plus an internal member management
system (XP, evaluations, nodes, events, voting, endorsements).

Rebuild of [`argc_platform`](https://github.com/ARGCoders/argc_platform). Only the hero
and navbar are carried over so far; the rest of the UI is being redesigned.

## Stack

| Layer           | Choice                                                             |
| --------------- | ------------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router)                                            |
| Language        | TypeScript, strict + `noUncheckedIndexedAccess`                    |
| Styling         | Tailwind CSS v4 — no config file, tokens live in `app/globals.css` |
| Components      | shadcn/UI, rethemed to the ARGC palette                            |
| Backend         | PocketBase                                                         |
| Auth            | 42 Intra OAuth (custom, no NextAuth)                               |
| Tests           | Vitest + Testing Library                                           |
| Package manager | pnpm — do not commit an npm or yarn lockfile                       |

## Getting started

```bash
pnpm install
cp .env.example .env      # then FILL IN every value — see "Environment" below
make run                  # PocketBase + schema + Next.js
```

`.env` is a hard prerequisite: the app will not run with blank values. `make run` starts
PocketBase on `:8090`, applies the schema, and starts Next on `:3000`.
Run `make help` for the full target list.

To develop against the local database rather than production, point
`NEXT_PUBLIC_POCKETBASE_URL` at `http://127.0.0.1:8090` in `.env`. The admin UI is at
`http://127.0.0.1:8090/_/`.

### Environment

Every variable in `.env.example` is required except `NEXT_PUBLIC_APP_URL`. Missing values
fail at request time, not build time, with `Missing required environment variable: <NAME>`.
This hits the blog and every page that touches PocketBase, not just auth — and it includes
the 42 OAuth pair: the env accessor validates the whole set on any read, so an empty
`NEXT_PUBLIC_42_CLIENT_ID` breaks PocketBase reads too. Fill `.env` before running the app.

## Commands

| Command                        | Does                                  |
| ------------------------------ | ------------------------------------- |
| `pnpm dev`                     | Next.js dev server                    |
| `pnpm build`                   | Production build                      |
| `pnpm test`                    | Vitest, watch mode                    |
| `pnpm test:run`                | Vitest once — what CI runs            |
| `pnpm test:coverage`           | Coverage report                       |
| `pnpm lint` / `lint:fix`       | ESLint                                |
| `pnpm format` / `format:check` | Prettier                              |
| `pnpm typecheck`               | `tsc --noEmit`                        |
| `pnpm db:setup`                | Apply `scripts/setup-collections.mjs` |
| `make check`                   | Everything CI runs, in order          |

Run `make check` before pushing. CI runs the same sequence and will reject anything that
fails it.

## Deploying the backend

PocketBase is a deployable service in [`pocketbase/`](pocketbase/), not something set up
by hand in a dashboard. `make help` lists every target.

```bash
make pb-image-run     # run the exact image locally first
make pb-provision     # ONE-TIME: service + volume
make pb-deploy
make pb-backup        # before anything risky
```

The volume mounted at `/pb_data` is not optional: without it the database is destroyed on
every deploy. See [`pocketbase/README.md`](pocketbase/README.md).

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/) —
  `feat(scope): imperative subject`, under 72 characters, no trailing period. A
  `commit-msg` hook enforces this.
- **Formatting** is Prettier's job, not yours. A `pre-commit` hook formats staged files.
- **Copy lives in `content/*.json`**, typed by `types/content.ts`. Editing text should
  never require touching a component.
- **The frontend never talks to PocketBase directly.** Everything goes through a Next.js
  route handler or a server component using the admin client.

New to the project? Read [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) first — it
covers where things stand, which decisions are already settled, and what to pick up.
Then [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the code is organised and
[`docs/COMPONENTS.md`](docs/COMPONENTS.md) for what already exists — check it before
writing a new component.

## Documentation

| File                       | Contents                                                     |
| -------------------------- | ------------------------------------------------------------ |
| `docs/PROJECT_STATUS.md`   | **Start here** — state, decisions, blockers, what is next    |
| `docs/ARCHITECTURE.md`     | Folder layout, conventions, the rules that are easy to break |
| `docs/COMPONENTS.md`       | Inventory of the existing component library                  |
| `docs/PLATFORM.md`         | Product specification for the dashboard                      |
| `docs/tracker-handbook.md` | Handbook content tracker                                     |

> `PLATFORM.md` and `tracker-handbook.md` were carried over from V1 and predate this
> repo. `PLATFORM.md` is the product specification and is still the reference for
> dashboard work, but some of its technical claims were verified wrong — see
> "Corrections to the carried-over docs" in `docs/ARCHITECTURE.md`. Read it as product
> intent, not as instruction.
