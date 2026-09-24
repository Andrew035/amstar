#!/usr/bin/env bash
# Replace the LOCAL database with the newest production backup from Backblaze.
#
# Deliberately not scheduled: this destroys whatever is in the local database,
# and a timer would do that in the middle of whatever you were testing. Run it
# when you sit down, not on a clock.
set -euo pipefail

REMOTE="${AMSTAR_REMOTE:-amstar-remote:amstar-backups}"
CACHE="${AMSTAR_DUMP_CACHE:-$HOME/.cache/amstar-dumps}"
CONTAINER="amstar_postgres"
DB_NAME="amstar_db"
DB_USER="amstar_user"
KEEP_CACHED=5

# --- guard ------------------------------------------------------------------
# The container is called amstar_postgres on the server too, so this script
# would happily overwrite production with a stale dump. /opt/amstar only exists
# there, which makes it a reliable tell.
if [ -d /opt/amstar ]; then
  echo "REFUSING: /opt/amstar exists - this looks like the production server." >&2
  exit 1
fi

command -v rclone >/dev/null 2>&1 || { echo "rclone is not installed" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running - try: open -a Docker" >&2; exit 1; }
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || {
  echo "$CONTAINER is not running - try: docker compose up -d postgres-db backend" >&2
  exit 1
}

# --- newest dump ------------------------------------------------------------
# Filenames are amstar_YYYY-MM-DD_HHMM.sql.gz, so lexical sort is chronological.
LATEST="$(rclone lsf "$REMOTE/" | grep '\.sql\.gz$' | sort | tail -1)"
[ -n "$LATEST" ] || { echo "no dumps found in $REMOTE" >&2; exit 1; }

mkdir -p "$CACHE"
if [ -f "$CACHE/$LATEST" ]; then
  echo "using cached  $LATEST"
else
  echo "downloading   $LATEST"
  rclone copy "$REMOTE/$LATEST" "$CACHE/"
fi

# --- restore ----------------------------------------------------------------
# The dump carries --clean --if-exists, so it drops and rebuilds as it loads.
echo "restoring into $DB_NAME ..."
gzip -dc "$CACHE/$LATEST" | docker exec -i "$CONTAINER" psql -q -U "$DB_USER" -d "$DB_NAME" >/dev/null

echo
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F'  ' -c "
  select 'tickets    ', count(*) from service_tickets
  union all select 'technicians', count(*) from technicians where is_active
  union all select 'users      ', count(*) from users
  union all select 'schema     ', max(version::int) from flyway_schema_history;"
echo
echo "local database now matches $LATEST"

# --- prune the download cache ----------------------------------------------
ls -t "$CACHE"/amstar_*.sql.gz 2>/dev/null | tail -n "+$((KEEP_CACHED + 1))" |
  while IFS= read -r old; do rm -f "$old"; done
