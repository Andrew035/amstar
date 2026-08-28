#!/usr/bin/env bash
# Nightly logical backup of the amstar database.
# Runs pg_dump *inside* the container so no client tools are needed on the host.
set -euo pipefail

BACKUP_DIR="${AMSTAR_BACKUP_DIR:-/var/backups/amstar}"
CONTAINER="amstar_postgres"
DB_NAME="amstar_db"
DB_USER="amstar_user"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/amstar_${STAMP}.sql.gz"

# -Fp (plain) + gzip keeps the dump greppable and restorable with psql alone.
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-
exists \
  | gzip -9 > "$OUT.tmp"

# Only promote the file once the dump exited 0 and produced real content,
# so a failed run never overwrites a good backup with a truncated one.
if [ ! -s "$OUT.tmp" ]; then
  echo "backup FAILED: empty dump" >&2
  rm -f "$OUT.tmp"
  exit 1
fi
mv "$OUT.tmp" "$OUT"

# Sanity check: a valid dump always contains the tickets table.
if ! gzip -dc "$OUT" | grep -q "CREATE TABLE public.service_tickets"; then
  echo "backup FAILED: dump missing service_tickets" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'amstar_*.sql.gz' -mtime "+$KEEP_DAYS" -delete
echo "backup OK: $OUT ($(du -h "$OUT" | CUT -f1))"

rclone copy "$OUT" amstar-remote:amstar-backups/
