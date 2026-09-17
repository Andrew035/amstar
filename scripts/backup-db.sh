#!/usr/bin/env bash
# Hourly logical backup of the amstar database (scheduled by root's crontab, see DEPLOY.md).
# Runs pg_dump *inside* the container so no client tools are needed on the host.
set -euo pipefail

BACKUP_DIR="${AMSTAR_BACKUP_DIR:-/var/backups/amstar}"
CONTAINER="amstar_postgres"
DB_NAME="amstar_db"
DB_USER="amstar_user"
KEEP_ALL_DAYS=7
KEEP_DAILY_DAYS=90

# Dead-man's switch. Without this, a backup that silently stops running is
# indistinguishable from one that works. The ping URL comes from the
# environment so the script itself stays committable.
HC_URL="${AMSTAR_HC_URL:-}"
ping_hc() {
  [ -n "$HC_URL" ] || return 0
  curl -fsS -m 10 --retry 3 "${HC_URL}$1" >/dev/null 2>&1 || true
}

# Any non-zero exit - dump failed, empty file, missing table, offsite failed -
# reports failure before the script dies.
trap 'rc=$?; if [ $rc -ne 0 ]; then rm -f "${OUT:-}.tmp"; ping_hc "/fail"; fi; exit $rc' EXIT

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/amstar_${STAMP}.sql.gz"

# -Fp (plain) + gzip keeps the dump greppable and restorable with psql alone.
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
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

# Retention
# Every backup for 7 days, then the first of each day for 90.
# The whole DB gzips to ~4 KB, so 90 days of history costs under 10 MB.
find "$BACKUP_DIR" -name 'amstar_*.sql.gz' -mtime +"$KEEP_ALL_DAYS" | while read -r old; do
  day=$(basename "$old" | sed -E 's/amstar_([0-9]{4}-[0-9]{2}-[0-9]{2})_.*/\1/')
  keep=$(find "$BACKUP_DIR" -name "amstar_${day}_*.sql.gz" | sort | head -1)
  [ "$old" = "$keep" ] || rm -f "$old"
done
find "$BACKUP_DIR" -name 'amstar_*.sql.gz' -mtime +"$KEEP_DAILY_DAYS" -delete

echo "backup OK (local): $OUT ($(du -h "$OUT" | cut -f1))"

# Offsite
if command -v rclone >/dev/null 2>&1; then
  rclone copy "$OUT" amstar-remote:amstar-backups/
  rclone delete --min-age "${KEEP_DAILY_DAYS}d" amstar-remote:amstar-backups/ 2>/dev/null || true
  echo "backup OK (offsite): $(basename "$OUT")"
else
  echo "WARNING: rclone not installed - backup is LOCAL ONLY" >&2
fi

ping_hc ""
