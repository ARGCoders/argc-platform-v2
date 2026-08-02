#!/bin/sh
set -e

DATA_DIR="${PB_DATA_DIR:-/pb_data}"
mkdir -p "$DATA_DIR"

# Create or update the superuser from environment variables so a fresh volume
# comes up ready to use, rather than waiting on the one-time installer link
# printed to logs nobody reads.
#
# `upsert` is idempotent: it is safe on every boot and lets the password be
# rotated by changing the variable and redeploying.
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  echo "Ensuring superuser $PB_ADMIN_EMAIL"
  pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DATA_DIR" || true
else
  echo "PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD not set — create the superuser via the installer link below."
fi

# 0.0.0.0 is required: binding to 127.0.0.1 makes the container unreachable
# from Railway's proxy and the service appears to deploy but never responds.
exec pocketbase serve \
  --http="0.0.0.0:${PORT:-8090}" \
  --dir="$DATA_DIR"
