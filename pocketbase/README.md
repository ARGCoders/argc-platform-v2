# PocketBase service

Deployable definition for the ARGC backend.

## Why this exists

The original instance at `pocketbase-production-59e1.up.railway.app` was created by hand
in the Railway dashboard. Nothing in git described it, so when the service was removed
there was no way to recreate it — the URL now returns `404 Application not found`, and
neither Railway project contains a PocketBase service any more.

This directory makes the backend reproducible. Treat it, together with
`../scripts/setup-collections.mjs`, as the definition of the backend: this file provides
the server, that script provides the schema.

## Deploying

Every step is a Makefile target — run `make help` for the list.

```bash
make pb-image-run     # optional: run the exact image locally first
make pb-provision     # ONE-TIME: links a project, creates the service and volume
                      # set PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD on the service now
make pb-deploy        # ship it
make pb-logs          # watch it come up
```

Service variables:

| Variable            | Value                                    |
| ------------------- | ---------------------------------------- |
| `PB_ADMIN_EMAIL`    | superuser email                          |
| `PB_ADMIN_PASSWORD` | a strong password, not the local dev one |

`PORT` is injected by Railway. Generate a public domain for the service, then point
`NEXT_PUBLIC_POCKETBASE_URL` at it and run:

```bash
pnpm db:setup     # idempotent; creates all 17 collections
```

## The volume is not optional

Without a volume mounted at `/pb_data`, the container filesystem is ephemeral and **the
entire database is destroyed on every deploy**. This is the single most common way to
lose a PocketBase instance on a container host.

`make pb-deploy` warns if no volume is mounted, but it cannot stop you — take a backup
before any risky change:

```bash
make pb-backup     # downloads the deployed /pb_data into backups/
```

## Local development

You do not need this image locally. `make db` downloads the same pinned PocketBase
version and runs it on `:8090` against a local `pb_data`.

Keep `ARG PB_VERSION` in the Dockerfile in step with `PB_VERSION` in the Makefile so both
environments run the same build.

## Restoring the existing data

The surviving copy of the V1 database is the local `pb_data` directory — the deployed
volume went with the deleted service.

```bash
make pb-restore    # uploads local pb_data to the deployed volume
```

`db:setup` recreates the collections but not the records, so this is what carries real
data across. The target asks for confirmation because it overwrites the deployed
database.
