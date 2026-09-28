#!/usr/bin/env bash
# Restore the production database from a backup.
#
# This is the DESTRUCTIVE counterpart to the drill in RUNBOOK.md section 3. The
# drill restores into a throwaway `drill` database and drops it; this one writes
# to amstar_db and replaces everything in it.
#
#   sudo ./restore-db.sh --list          show every dump and what is in it
#   sudo ./restore-db.sh                 restore the newest dump
#   sudo ./restore-db.sh <file.sql.gz>   restore a specific dump
#
# Always prints the contents of the chosen dump and waits for confirmation, so
# a dump taken *after* the data was lost cannot be restored by accident.
set -euo pipefail

APP_DIR="${AMSTAR_APP_DIR:-/opt/amstar}"
BACKUP_DIR="${AMSTAR_BACKUP_DIR:-/var/backups/amstar}"
CONTAINER="amstar_postgres"
DB_NAME="amstar_db"
DB_USER="amstar_user"

[ -d "$APP_DIR" ] || { echo "refusing: $APP_DIR not found - this script runs on the server" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "run with sudo - the dumps are root-owned" >&2; exit 1; }

# Rows inside a dump's COPY block, without restoring it.
rows_in() {
  gzip -dc "$1" 2>/dev/null |
    awk -v t="$2" '$0 ~ "^COPY public\\."t" " {f=1;next} /^\\\\\.$/{f=0} f' |
    grep -c . || true
}

if [ "${1:-}" = "--list" ]; then
  printf "%-8s %-8s %-8s %s\n" "TICKETS" "USERS" "VEHICLES" "DUMP"
  for f in $(ls -t "$BACKUP_DIR"/amstar_*.sql.gz 2>/dev/null); do
    printf "%-8s %-8s %-8s %s\n" \
      "$(rows_in "$f" service_tickets)" "$(rows_in "$f" users)" \
      "$(rows_in "$f" vehicles)" "$(basename "$f")"
  done
  exit 0
fi

DUMP="${1:-$(ls -t "$BACKUP_DIR"/amstar_*.sql.gz 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "no dump found - try --list" >&2; exit 1; }
gzip -t "$DUMP" 2>/dev/null || echo "note: gzip reports trailing bytes; payload is still readable"

TICKETS=$(rows_in "$DUMP" service_tickets)
USERS=$(rows_in "$DUMP" users)

cat <<EOF

  Restoring : $(basename "$DUMP")
  Taken     : $(date -r "$DUMP" '+%Y-%m-%d %H:%M')
  Contains  : $TICKETS tickets, $USERS users

  This REPLACES everything currently in $DB_NAME.
EOF

if [ "$TICKETS" -eq 0 ]; then
  echo "  WARNING: this dump has NO tickets. If you are recovering lost data,"
  echo "           it was probably taken after the loss. Check --list first."
fi

printf "\n  Type RESTORE to continue: "
read -r reply
[ "$reply" = "RESTORE" ] || { echo "aborted - nothing changed"; exit 1; }

cd "$APP_DIR"

echo "==> snapshotting current state first"
"$APP_DIR/scripts/backup-db.sh" || echo "    (snapshot failed - continuing, the dump above is still intact)"

echo "==> stopping the backend so nothing writes mid-restore"
docker compose stop backend

echo "==> restoring"
gzip -dc "$DUMP" | docker exec -i "$CONTAINER" psql -q -U "$DB_USER" -d "$DB_NAME" >/dev/null

echo "==> starting the backend"
docker compose start backend

echo
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F'  ' -c "
  select 'tickets    ', count(*) from service_tickets
  union all select 'technicians', count(*) from technicians where is_active
  union all select 'users      ', count(*) from users;"
echo
echo "done - restored from $(basename "$DUMP")"
