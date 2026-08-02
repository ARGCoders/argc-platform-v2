PB_VERSION = 0.30.0
PB_BIN     = tools/pocketbase
PB_PORT    = 8090
PB_DIR     = pb_data
DEV_PORT   = 3000

# PocketBase auto-writes a JS migration for every schema change, defaulting to
# <parent-of-data-dir>/pb_migrations — i.e. the repo root. Those files would be
# committed by accident and become a second, competing source of schema truth
# alongside scripts/setup-collections.mjs. Keeping them inside pb_data, which is
# gitignored, means local experiments never leak into the repo.
PB_MIGRATIONS = $(PB_DIR)/migrations

# ── Portability ─────────────────────────────────────────────────────────────
# Detected, not assumed. Hardcoding linux/amd64 meant `make db` downloaded an
# unrunnable binary on macOS and on ARM.
#
# PocketBase publishes: linux|darwin|windows × amd64|arm64
PB_OS   := $(shell uname -s | tr '[:upper:]' '[:lower:]')
PB_ARCH := $(shell uname -m | sed -e 's/^x86_64$$/amd64/' -e 's/^aarch64$$/arm64/' -e 's/^arm64$$/arm64/')
PB_TMP  := $(if $(TMPDIR),$(TMPDIR:/=),/tmp)
PB_LOG   = $(PB_TMP)/argc-pocketbase.log
NEXT_LOG = $(PB_TMP)/argc-next.log

# Is a TCP port in use? lsof is not installed everywhere, so fall back to a
# connection attempt. Used as $(call port_busy,PORT) inside a shell `if`.
port_busy = { command -v lsof >/dev/null 2>&1 && lsof -i :$(1) >/dev/null 2>&1; } \
            || curl -s -o /dev/null -m 2 http://127.0.0.1:$(1)/ 2>/dev/null

# Kill whatever holds a port. `xargs -r` is GNU-only and errors on macOS.
kill_port = PIDS=$$(lsof -t -i :$(1) 2>/dev/null); \
            if [ -n "$$PIDS" ]; then kill $$PIDS 2>/dev/null || true; fi

# PocketBase superuser for LOCAL development only. Never reuse a real password.
PB_ADMIN_EMAIL    = admin@argc.local
PB_ADMIN_PASSWORD = argc-local-dev

# ── Deployment ──────────────────────────────────────────────────────────────
PB_SERVICE    = pocketbase
PB_SRC        = pocketbase
PB_MOUNT      = /pb_data
PB_IMAGE      = argc-pocketbase
PB_IMAGE_PORT = 9099
BACKUP_DIR    = backups
CONTAINER    := $(shell command -v podman 2>/dev/null || command -v docker 2>/dev/null)

# `:Z` relabels the bind mount for SELinux. Required on Fedora/RHEL with
# podman, and rejected outright by Docker Desktop on macOS.
VOL_OPT := $(if $(filter linux,$(PB_OS)),:Z,)

.PHONY: help install db db-setup dev run stop clean test check \
        pb-image pb-image-run pb-image-stop \
        pb-provision pb-deploy pb-logs pb-status pb-backup pb-restore \
        require-railway

help:
	@echo "ARGC Platform V2"
	@echo ""
	@echo "Local development"
	@echo "  make install       Install dependencies"
	@echo "  make db            Start local PocketBase on :$(PB_PORT) (downloads it once)"
	@echo "  make db-setup      Create/update collections from scripts/setup-collections.mjs"
	@echo "  make dev           Start Next.js on :$(DEV_PORT)"
	@echo "  make run           db + db-setup + dev"
	@echo "  make check         Everything CI runs: format, lint, typecheck, test, build"
	@echo "  make stop          Stop both servers"
	@echo "  make clean         Stop, then delete the local database"
	@echo ""
	@echo "Container image (test the deploy before shipping it)"
	@echo "  make pb-image      Build the PocketBase image from $(PB_SRC)/"
	@echo "  make pb-image-run  Run it on :$(PB_IMAGE_PORT) exactly as Railway would"
	@echo "  make pb-image-stop Remove the test container"
	@echo ""
	@echo "Railway (deployed PocketBase)"
	@echo "  make pb-provision  ONE-TIME: create the service and its volume"
	@echo "  make pb-deploy     Deploy $(PB_SRC)/ to the '$(PB_SERVICE)' service"
	@echo "  make pb-logs       Tail deployed logs"
	@echo "  make pb-status     Show the linked project and service"
	@echo "  make pb-backup     Download the deployed database to $(BACKUP_DIR)/"
	@echo "  make pb-restore    Upload local $(PB_DIR) to the deployed volume"
	@echo ""
	@echo "  Point NEXT_PUBLIC_POCKETBASE_URL at http://127.0.0.1:$(PB_PORT) in .env"
	@echo "  so development stops reading and writing production data."

install:
	pnpm install

$(PB_BIN):
	@command -v curl >/dev/null 2>&1 || { echo "curl is required."; exit 1; }
	@command -v unzip >/dev/null 2>&1 || { echo "unzip is required."; exit 1; }
	@echo "Downloading PocketBase $(PB_VERSION) for $(PB_OS)/$(PB_ARCH)..."
	@mkdir -p tools
	@curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v$(PB_VERSION)/pocketbase_$(PB_VERSION)_$(PB_OS)_$(PB_ARCH).zip" -o "$(PB_TMP)/pb.zip" \
		|| { echo "Download failed. No PocketBase build for $(PB_OS)/$(PB_ARCH)?"; exit 1; }
	@unzip -o -q "$(PB_TMP)/pb.zip" -d tools pocketbase
	@rm -f "$(PB_TMP)/pb.zip"
	@chmod +x $(PB_BIN)
	@echo "  -> $(PB_BIN)"

db: $(PB_BIN)
	@mkdir -p $(PB_DIR)
	@if $(call port_busy,$(PB_PORT)); then \
		echo "PocketBase already running on :$(PB_PORT)"; \
	else \
		echo "Starting PocketBase on :$(PB_PORT)..."; \
		mkdir -p "$(PB_MIGRATIONS)"; \
		$(PB_BIN) superuser upsert $(PB_ADMIN_EMAIL) $(PB_ADMIN_PASSWORD) --dir="$(PB_DIR)" --migrationsDir="$(PB_MIGRATIONS)" >/dev/null 2>&1 || true; \
		$(PB_BIN) serve --http="127.0.0.1:$(PB_PORT)" --dir="$(PB_DIR)" --migrationsDir="$(PB_MIGRATIONS)" > "$(PB_LOG)" 2>&1 & \
		sleep 2; \
		echo "  admin UI: http://127.0.0.1:$(PB_PORT)/_/"; \
		echo "  login:    $(PB_ADMIN_EMAIL) / $(PB_ADMIN_PASSWORD)"; \
	fi

db-setup:
	@pnpm db:setup

dev:
	@if $(call port_busy,$(DEV_PORT)); then \
		echo "Next.js already running on :$(DEV_PORT)"; \
	else \
		pnpm dev > "$(NEXT_LOG)" 2>&1 & \
		sleep 3; \
		echo "  http://localhost:$(DEV_PORT)"; \
	fi

run: db db-setup dev
	@echo ""
	@echo "Ready. Logs: $(PB_LOG)  $(NEXT_LOG)"

check:
	pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:run && pnpm build

test:
	pnpm test:run

stop:
	@command -v lsof >/dev/null 2>&1 || { echo "lsof not found — stop the servers manually."; exit 0; }
	@-$(call kill_port,$(PB_PORT))
	@-$(call kill_port,$(DEV_PORT))
	@echo "Stopped."

clean: stop
	@rm -rf $(PB_DIR)
	@echo "Local database deleted. Run 'make db && make db-setup' to recreate."

# ─────────────────────────────────────────────────────────────────────────────
# Container image
#
# Build and run the deployed image locally before shipping it. A PocketBase
# container that binds the wrong interface, or loses its volume, looks healthy
# in the build log and fails only once it is live.
# ─────────────────────────────────────────────────────────────────────────────

pb-image:
	@test -n "$(CONTAINER)" || { echo "Need podman or docker."; exit 1; }
	$(CONTAINER) build -t $(PB_IMAGE) $(PB_SRC)

pb-image-run: pb-image
	@$(CONTAINER) rm -f $(PB_IMAGE) >/dev/null 2>&1 || true
	@mkdir -p $(PB_TMP)/$(PB_IMAGE)-vol
	@$(CONTAINER) run -d --name $(PB_IMAGE) \
		-e PORT=$(PB_IMAGE_PORT) \
		-e PB_ADMIN_EMAIL=$(PB_ADMIN_EMAIL) \
		-e PB_ADMIN_PASSWORD=$(PB_ADMIN_PASSWORD) \
		-v $(PB_TMP)/$(PB_IMAGE)-vol:$(PB_MOUNT)$(VOL_OPT) \
		-p $(PB_IMAGE_PORT):$(PB_IMAGE_PORT) $(PB_IMAGE) >/dev/null
	@sleep 4
	@printf "  health: "; curl -s -m 10 http://127.0.0.1:$(PB_IMAGE_PORT)/api/health || echo "NO RESPONSE"
	@echo ""
	@echo "  admin:  http://127.0.0.1:$(PB_IMAGE_PORT)/_/  ($(PB_ADMIN_EMAIL) / $(PB_ADMIN_PASSWORD))"
	@echo "  stop:   make pb-image-stop"

pb-image-stop:
	@-$(CONTAINER) rm -f $(PB_IMAGE) >/dev/null 2>&1 || true
	@rm -rf $(PB_TMP)/$(PB_IMAGE)-vol
	@echo "Test container removed."

# ─────────────────────────────────────────────────────────────────────────────
# Railway
#
# These act on the deployed backend. `railway link` is interactive by design —
# it picks the project, and guessing that is not something a Makefile should do.
# ─────────────────────────────────────────────────────────────────────────────

require-railway:
	@command -v railway >/dev/null 2>&1 || { \
		echo "Railway CLI not found. Install: https://docs.railway.com/guides/cli"; exit 1; }

# One-time. The volume is the whole point: without it the container filesystem
# is ephemeral and the database is destroyed on every single deploy.
pb-provision: require-railway
	@echo "Linking a project (interactive)..."
	railway link
	railway add --service $(PB_SERVICE) --variables "PB_ADMIN_EMAIL=change-me@argc" --variables "PB_ADMIN_PASSWORD=change-me"
	@# `volume add` takes the service from the link, not a --service flag. Passing
	@# one is a usage error, and `railway volume -s X add` panics in CLI 5.26.
	railway link -s $(PB_SERVICE)
	railway volume add -m $(PB_MOUNT)
	@echo ""
	@echo "Next:"
	@echo "  1. Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD on the '$(PB_SERVICE)' service"
	@echo "  2. make pb-deploy"
	@echo "  3. Generate a public domain, then point NEXT_PUBLIC_POCKETBASE_URL at it"
	@echo "  4. pnpm db:setup"

pb-deploy: require-railway
	@railway volume list --service $(PB_SERVICE) 2>/dev/null | grep -q "$(PB_MOUNT)" \
		|| echo "WARNING: no volume mounted at $(PB_MOUNT) — this deploy will wipe the database."
	railway up $(PB_SRC) --service $(PB_SERVICE)

pb-logs: require-railway
	railway logs --service $(PB_SERVICE)

pb-status: require-railway
	@railway status
	@railway volume list --service $(PB_SERVICE) 2>/dev/null || true

# Take one before any risky change. The deployed volume is the only copy of
# production data — the previous instance was lost with no backup.
pb-backup: require-railway
	@mkdir -p $(BACKUP_DIR)
	railway volume files download $(PB_MOUNT) \
		--service $(PB_SERVICE) --output $(BACKUP_DIR)
	@echo "Downloaded to $(BACKUP_DIR)/"

# Seeds a fresh deployment from the local database. db:setup recreates the
# collections but not the records — this is what carries those across.
pb-restore: require-railway
	@test -d $(PB_DIR) || { echo "No local $(PB_DIR) to upload."; exit 1; }
	@echo "This overwrites the deployed database at $(PB_MOUNT)."
	@printf "Type 'yes' to continue: "; read ans; [ "$$ans" = "yes" ] || { echo "Aborted."; exit 1; }
	railway volume files upload $(PB_DIR) $(PB_MOUNT) --service $(PB_SERVICE)
