# AM Star — Runbook

The things you do regularly, and the traps that have already caught you once.

`DEPLOY.md` covers standing the server up from nothing. This file covers the
week-to-week loop: shipping a change, testing against real data, proving the
backups work, and the handful of rules that are cheap to follow and expensive
to forget.

Two machines are involved throughout. Know which one you are on:

| | Prompt looks like | Holds |
|---|---|---|
| **Your Mac** | `~/D/C/C/P/amstar ❱` | the working copy you edit |
| **The server** | `ubuntu@ip-172-31-2-139:/opt/amstar$` | production, at `amstartransmissions.org` |

They never talk to each other directly. GitHub sits in between.

---

## 1. Shipping a change to the server

### On your Mac

```bash
git checkout -b feat/whatever        # never work directly on main
# ...make the change...

cd backend  && ./mvnw test           # ~12s, must be green
cd ../frontend && npm run build && npm run lint
cd ..

git add -A && git commit -m "what changed and why"
git checkout main && git merge feat/whatever
git push
git branch -d feat/whatever
```

`npm run build` runs `tsc -b` first, so it is also the type check. CI runs the
same two commands and nothing else, so if both pass locally the push is safe.

### On the server

```bash
ssh amstar
cd /opt/amstar

sudo /opt/amstar/scripts/backup-db.sh        # before anything, every time
git pull

cd frontend && npm ci && npm run build && cd ..
docker compose up -d --build backend
docker compose restart caddy

docker compose logs -f backend | head -40    # watch it come up
```

The backup first is not ceremony. Flyway applies any new `V*.sql` automatically
when the backend starts, and a migration that half-applies against real data is
the one failure you cannot undo with `git revert`.

### Did it work

```bash
docker compose ps                                  # all three Up
docker compose logs backend | grep Migrating       # schema version applied
curl -s -o /dev/null -w "%{http_code}\n" https://amstartransmissions.org
```

`200` from the last one and you are done. If the frontend looks unchanged, you
skipped `npm run build` — see the trap list below.

---

## 2. A test environment, with real data

Your Mac is the staging environment. What makes it useful is loading a copy of
production into it, because the failures worth catching are migrations meeting
real rows, not code that crashes on an empty table.

```bash
cd ~/Documents/Code_and_school/Code/Projects/amstar

# newest production dump, straight out of Backblaze
LATEST=$(rclone lsf amstar-remote:amstar-backups/ | sort | tail -1)
rclone copy "amstar-remote:amstar-backups/$LATEST" /tmp/

open -a Docker                                    # Docker Desktop must be up
docker compose up -d postgres-db backend

gzip -dc "/tmp/$LATEST" | docker exec -i amstar_postgres psql -U amstar_user -d amstar_db

cd frontend && npm run dev                        # http://localhost:5173
```

The dump carries `--clean --if-exists`, so it drops and rebuilds as it loads.
Re-pull it before any deploy that touches the schema; it gets more useful as the
shop accumulates tickets.

**Your local `.env` must point at localhost**, not the live domain:

```
AMSTAR_CORS_ORIGIN=http://localhost:5173
AMSTAR_APP_URL=http://localhost:5173
```

Keep a `.env.production.bak` beside it if you like, but never let production
values sit in the Mac's `.env` — see trap 3 and trap 4.

---

## 3. Proving the backups work

A backup you have never restored is a belief, not a backup. Quarterly, and after
any change to the schema or the backup script.

```bash
ssh amstar

LATEST=$(sudo ls -t /var/backups/amstar/amstar_*.sql.gz | head -1)
echo "restoring: $LATEST"

docker exec amstar_postgres psql -U amstar_user -d amstar_db -c "create database drill;"
sudo gzip -dc "$LATEST" | docker exec -i amstar_postgres psql -U amstar_user -d drill
docker exec amstar_postgres psql -U amstar_user -d drill \
  -c "select count(*) from service_tickets;" \
  -c "select count(*) from technicians where is_active;"
docker exec amstar_postgres psql -U amstar_user -d amstar_db -c "drop database drill;"
```

The technician count is the meaningful one — it proves real rows came back
rather than an empty schema. Ticket count should look like the shop's week.

### Is the schedule still alive

```bash
sudo crontab -l                                   # one entry, with the PATH= line
ls -lt /var/backups/amstar | head -5              # newest file within the hour
tail -20 /var/log/amstar-backup.log
rclone ls amstar-remote:amstar-backups/ | tail -5 # offsite copy landed
```

And healthchecks.io should be green. If it is red you have an email already;
if it is green but the file list is stale, the ping is lying — check that the
cron's `AMSTAR_HC_URL` is not also set somewhere else that still runs.

---

## 4. Traps

Each of these has already cost time once.

### 1. `docker compose restart` does not reload `.env`

`restart` reuses the existing container with its baked-in environment. After any
`.env` change:

```bash
docker compose up -d --force-recreate backend
docker inspect amstar_backend --format '{{range .Config.Env}}{{println .}}{{end}}' | grep CORS
```

### 2. `docker exec amstar_postgres` works identically on both machines

The container has the same name on your Mac and on the server. A restore command
pasted into the wrong tab overwrites production with a stale dump while the shop
is using it. Before anything destructive:

```bash
hostname     # ip-172-31-2-139 means PRODUCTION. Stop and read again.
```

### 3. CORS is an exact string match

`https://localhost:5173` and `http://localhost:5173` are different origins.
`SecurityConfig` allows exactly one, from `AMSTAR_CORS_ORIGIN`. The browser error
is identical whether the scheme, host or port is wrong.

### 4. `AMSTAR_APP_URL` fails silently

It only appears in password-reset emails. Point it at the wrong place and the app
starts fine, logs nothing, and sends managers links that go nowhere.

### 5. Docker does not build the frontend

Caddy mounts `frontend/dist` read-only from disk. `docker compose up --build`
rebuilds the backend image and leaves the frontend exactly as it was. If a change
did not appear, you skipped `npm run build`.

### 6. Tracked files edited on the server cause merge conflicts

`Caddyfile` and `application.properties` are in git. Edit them on your Mac, push,
and pull them down. `.env` is the only file meant to differ per machine, which is
why it is gitignored. Anything you find yourself editing on the server twice
belongs in `.env` instead.

### 7. Never edit a migration that has run

Flyway checksums every `V*.sql`. Change one that has been applied anywhere and
the backend refuses to start. Fix forward with a new file — `V10__…` next.

Filenames need a **capital V**. A lowercase `v9__…` is silently ignored, which
once shipped a missing CHECK constraint to production.

### 8. Cron needs its own `PATH`

Cron's default `PATH` excludes `/usr/local/bin`, so `docker` is not found and the
backup fails silently at 2am. The `PATH=` line in the crontab is load-bearing.

### 9. rclone config is per-user

The cron runs as root; you configured rclone as `ubuntu`. Without a copy at
`/root/.config/rclone/rclone.conf` the hourly job quietly falls back to local
only — and still exits 0, so the dead-man's switch never fires.

### 10. One dead-man's switch, one pinger

If two machines ping the same healthchecks.io URL, the check goes green when
either runs. A dead server then looks healthy. One check per thing being watched.

### 11. Do not query DNS before creating the record

Cloudflare's negative TTL is 1800s. Ask for a record that does not exist yet and
your resolver caches "no such record" for thirty minutes, long after you have
added it. Create first, then check — and use `dig +short name @1.1.1.1` to skip
your own cache.

### 12. `truncate` needs `min-w-0` inside a flex container

A flex item will not shrink below its content width, so the truncation silently
does nothing and the text overflows into its neighbour. This is the single most
common styling bug in this codebase.

---

## 5. Quick reference

```bash
# --- server ---
ssh amstar
docker compose ps
docker compose logs -f backend caddy
sudo /opt/amstar/scripts/backup-db.sh
docker exec amstar_postgres psql -U amstar_user -d amstar_db

# who has what role
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "select email, username, role from users order by id;"

# what schema version is live
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "select version, description, success from flyway_schema_history order by installed_rank desc limit 5;"

# --- mac ---
cd backend && ./mvnw test
cd frontend && npm run build && npm run lint
docker compose up -d --force-recreate backend
```

Deeper material lives in [`DEPLOY.md`](DEPLOY.md): first deploy, disaster
recovery, user administration, troubleshooting, known limitations.
