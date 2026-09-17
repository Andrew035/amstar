# AM Star — Deploy & Operations

Everything needed to put this app on a server, keep it backed up, and get it
back after a failure. Written so someone who is not the original developer can
follow it.

---

## 1. Architecture

One Linux VM running three containers: Caddy in front, then the backend and
Postgres.

```
                    Internet
                       │
                  :80 / :443
                       │
              ┌────────▼────────┐
              │  amstar_caddy   │  automatic TLS from Let's Encrypt
              │                 │  serves frontend/dist as static files
              └───┬─────────┬───┘
       /api/*     │         │   everything else
                  │         └──────────► /srv/index.html  (React SPA)
                  ▼
         ┌─────────────────┐
         │ amstar_backend  │  bound to 127.0.0.1:8080 — not public
         └────────┬────────┘
                  │  internal docker network
                  ▼
         ┌─────────────────┐
         │ amstar_postgres │  no published port at all
         │                 │  data in volume: amstar_postgres_data
         └─────────────────┘
```

Only ports 80 and 443 are open to the internet. Postgres is reachable only by
the backend; the backend only by Caddy.

**The frontend is not built by Docker.** Caddy bind-mounts `./frontend/dist`,
so `npm run build` is a required deploy step. Forgetting it is the single most
common deploy mistake — the symptom is a UI change that never appears.

Sizing: 2 GB RAM is comfortable, 1 GB works. Ubuntu 22.04 or 24.04.

---

## 2. Pre-launch checklist

Every one of these is a placeholder that must be replaced before real use.

| # | Where | Placeholder | Replace with |
|---|-------|-------------|--------------|
| 1 | `Caddyfile` line 1 | `shop.example.com` | the real domain |
| 2 | `.env` | `AMSTAR_CORS_ORIGIN` | `https://<real domain>` |
| 3 | `.env` | `AMSTAR_APP_URL` | `https://<real domain>` |
| 4 | `.env` | `AMSTAR_SMTP_USER` / `_PASSWORD` | Gmail address + App Password |
| 5 | `.env` | `AMSTAR_HC_URL` | healthchecks.io ping URL |
| 6 | `application.properties` | `amstar.auth.admin-emails` | verify the manager emails |

**Items 2 and 3 are silent failures.** Both default to `http://localhost:5173`.
Wrong, the app still starts — password reset links just point at localhost and
go nowhere.

DNS must resolve to the server *before* first start. Caddy cannot get a
certificate otherwise, and repeated failures get you rate-limited at Let's
Encrypt for an hour.

---

## 3. First deploy

```bash
# 1. Prerequisites on a fresh Ubuntu VM
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git rclone curl
# Node 22 from NodeSource: Ubuntu's own nodejs package is too old for Vite 8 (needs 20.19+)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo usermod -aG docker $USER && newgrp docker

# 2. Get the code
sudo mkdir -p /opt/amstar && sudo chown $USER /opt/amstar
git clone <your-repo-url> /opt/amstar
cd /opt/amstar

# 3. Secrets — never committed
cp .env.example .env
openssl rand -base64 48   # -> AMSTAR_JWT_SECRET   (must be >= 32 bytes)
openssl rand -base64 24   # -> POSTGRES_PASSWORD
openssl rand -base64 12   # -> AMSTAR_SIGNUP_CODE  (give this to the managers)
chmod 600 .env
# Then fill in every value from the checklist in section 2.

# 4. Firewall
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable

# 5. Build the frontend — Docker does NOT do this
cd frontend && npm ci && npm run build && cd ..

# 6. Start
docker compose up -d --build

# 7. Watch the first boot
docker compose logs -f backend caddy
```

You are looking for three things:

- Flyway: `Migrating schema "public" to version "1"` through the latest (`"6"` today)
- `Started RepairServiceApplication`
- Caddy: `certificate obtained successfully`

Then set up backups (section 5) and **run one restore drill** (section 7).

### Register the managers

Each manager visits `https://<domain>/register` with the email listed in
`amstar.auth.admin-emails` plus the signup code. Verify the roles took — a
manager who sees no Pricing tab registered with the wrong address:

```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "select email, username, role from users order by id;"
```

---

## 4. Updating

```bash
cd /opt/amstar
git pull
cd frontend && npm ci && npm run build && cd ..
docker compose up -d --build backend
docker compose restart caddy      # picks up the new dist
```

`docker compose up -d --build` alone will not refresh the frontend.

If a change did not appear, you skipped `npm run build`.

Database migrations run automatically: Flyway applies any new `V*.sql` file when
the backend starts. Take a manual backup first
(`/opt/amstar/scripts/backup-db.sh`) so a bad migration can be rolled back, and
check `docker compose logs backend | grep Migrating` afterwards.

---

## 5. Backups

`scripts/backup-db.sh` dumps the database, verifies the dump, prunes old ones,
copies offsite to Backblaze B2, and pings a dead-man's switch.

### Install the schedule

```bash
sudo bash -c '(crontab -l 2>/dev/null; cat <<EOF
PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
AMSTAR_HC_URL=https://hc-ping.com/YOUR-REAL-UUID
0 * * * * /opt/amstar/scripts/backup-db.sh >> /var/log/amstar-backup.log 2>&1
EOF
) | crontab -'

sudo crontab -l    # verify — running the above twice installs it twice
```

The `PATH=` line is required. Cron's default PATH does not include
`/usr/local/bin`, so `docker` would not be found and the job would fail
silently at 2am.

Hourly, not nightly: the database gzips to a few KB, so the cost is nothing and
the worst case drops from "lose a day of tickets" to "lose an hour".

### Configure rclone for offsite

```bash
rclone config      # name: amstar-remote, type: b2, then the B2 keyID + applicationKey
rclone lsd amstar-remote:
```

Backblaze B2's free tier (10 GB) holds years of these dumps. The application
key must be a real **App Key**, not the account ID — a keyID is ~25 characters
and the applicationKey ~31, starting `K00`.

### Dead-man's switch — do not skip this

Without it, a backup that stops running looks exactly like one that works.

1. Sign up at <https://healthchecks.io> (free)
2. Create a check named `amstar-backup`, period **1 hour**, grace **20 minutes**
3. Put its ping URL in `AMSTAR_HC_URL` (both `.env` and the crontab)
4. Set alerts to go to the developer **and** a manager

Now silence triggers an email instead of false confidence.

### Log rotation

```bash
sudo tee /etc/logrotate.d/amstar-backup <<'EOF'
/var/log/amstar-backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
EOF
```

### Retention

- Every backup kept for 7 days
- One per day kept for 90 days
- Offsite copies kept 90 days regardless of local pruning

---

## 6. Disaster recovery

The schema is rebuilt by Flyway from the migrations in
`backend/src/main/resources/db/migration/` (`V1`–`V6` today), so you only ever
restore **data**, never structure.

### Volume corrupted, or `docker compose down -v` run by accident

```bash
cd /opt/amstar
docker compose up -d postgres-db backend
docker compose logs backend | grep Migrating     # confirm every migration applied (V1..V6 today)

gzip -dc /var/backups/amstar/amstar_<newest>.sql.gz \
  | docker exec -i amstar_postgres psql -U amstar_user -d amstar_db

docker compose restart backend
```

### Server destroyed

```bash
# On a new VM, follow section 3 through step 5, then:
rclone copy amstar-remote:amstar-backups/amstar_<newest>.sql.gz ./
docker compose up -d --build
gzip -dc amstar_<newest>.sql.gz \
  | docker exec -i amstar_postgres psql -U amstar_user -d amstar_db
docker compose restart backend
```

This is why offsite matters: a backup on the dead server's disk is worthless.

### Always verify before declaring it fixed

```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "select count(*) from service_tickets;" \
  -c "select count(*) from users;" \
  -c "select max(entry_date) from service_tickets;"
```

`max(entry_date)` tells you how much data was actually lost. That is the number
the managers need to hear.

Expect `ERROR: ... does not exist` messages during a restore — that is
`--clean --if-exists` dropping objects a fresh database does not have yet.

---

## 7. Restore drill — quarterly

The only thing that proves the backups work. Fifteen minutes, four times a year.

```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db -c "create database drill;"
gzip -dc /var/backups/amstar/amstar_<newest>.sql.gz \
  | docker exec -i amstar_postgres psql -U amstar_user -d drill
docker exec amstar_postgres psql -U amstar_user -d drill \
  -c "select count(*) from service_tickets;" \
  -c "select count(*) from technicians where is_active;"
docker exec amstar_postgres psql -U amstar_user -d amstar_db -c "drop database drill;"
```

Technician count should match the active roster (10 at launch). Put a calendar
reminder on this.

---

## 8. User administration

### Add a manager

Admin is assigned **at registration only**, from the email allowlist. Adding an
email later does not promote an existing account.

New person:
1. Add the email to `amstar.auth.admin-emails` in `application.properties`
2. `docker compose up -d --build backend`
3. They register with that email

Existing account:
```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "update users set role='ADMIN' where email='them@example.com';"
```
They must log out and back in — the role lives in the JWT, which lasts 10 hours.

### Remove access

```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "update users set is_active=false where email='them@example.com';"
```

Blocks new logins. Their current token stays valid until it expires (≤10 hours).
To cut it off immediately, rotate the JWT secret.

### Rotate the JWT secret

Logs out everyone. This is the emergency lever for a compromised account —
a password reset alone does not invalidate existing tokens.

```bash
openssl rand -base64 48        # new AMSTAR_JWT_SECRET in .env
docker compose up -d backend   # `restart` will NOT reload .env
```

### Password resets

Managers use "Forgot your password?" on the login page. Links expire in 30
minutes and are single-use; requesting a new one invalidates the previous.

The endpoint always responds "if that address has an account…" regardless of
whether it does — deliberate, so nobody can discover who has accounts. That
means a broken SMTP config is silent. The only signal:

```bash
docker compose logs backend | grep "Failed to send password reset email"
```

---

## 9. Troubleshooting

| Symptom | Cause |
|---|---|
| UI loads but all data blank | `frontend/dist` stale or missing — rebuild the frontend |
| A UI change never appeared | `npm run build` skipped |
| "You do not have permission to make that change" | Account is `SHOP_VIEW`, not `ADMIN` — see "Add a manager" in section 8 |
| Kicked back to the login page | Token expired (10 hours) or the JWT secret was rotated — sign in again |
| Backend won't start: `Could not resolve placeholder` | A variable missing from `.env` |
| Backend won't start: `must be at least 32 bytes` | `AMSTAR_JWT_SECRET` too short |
| Backend won't start: `missing table` | Flyway did not run — inspect `flyway_schema_history` |
| No HTTPS | DNS not pointing here, 80/443 blocked, or the domain is still the placeholder |
| Caddy: `forbidden by policy` | `Caddyfile` still says `shop.example.com` |
| Reset emails never arrive | Check the mail log line in section 8 — usually a bad Gmail App Password (must be 16 chars) |
| Backups stopped | healthchecks.io alerts you. Check `/var/log/amstar-backup.log` |

A failed migration leaves a row in `flyway_schema_history` that blocks retries:

```bash
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "delete from flyway_schema_history where success = false;"
```

---

## 10. Known limitations

Documented so they are decisions, not surprises.

- **A few bad inputs return 409 instead of 400.** Most invalid input gets a
  400 with a readable message. Anything the backend does not check itself is
  caught by a database constraint and returns a generic 409 ("That change
  conflicts with existing data"). The write is rolled back cleanly; the real
  cause is in `docker compose logs backend`.
- **Rate limits are per-IP and in-memory.** `/api/auth/forgot-password` allows
  3/hour, other `/api/auth/*` routes 10/minute, enforced by Caddy. Limits reset
  when the Caddy container restarts. A distributed attacker with many IPs is not
  meaningfully slowed; this protects against single-source brute force and
  email-quota abuse, which is the realistic threat here.
- **Password reset does not invalidate active sessions.** JWTs are stateless.
  Rotate the secret (section 8) to force everyone out.
- **Unknown technician names are silently dropped** on assignment. Returns 200,
  name disappears. The dropdown only offers real names, so it needs a crafted
  request.
- **Deactivated technicians remain assignable via the API**, though hidden from
  the dropdown.
- **The service catalog has no cleanup path.** Typing a service creates it
  permanently; there is no UI to merge or delete. `PATCH /api/services/{id}`
  can deactivate one.
- **Two emails with the same local part collide** — `mike@a.com` and
  `mike@b.com` both display as `mike`. Cosmetic; authorization uses the role
  claim, not the name.
- **Single server.** No redundancy. Recovery means restoring from backup onto a
  new VM (section 6). Managed Postgres (~$15/mo) is the upgrade if the recovery
  window ever becomes unacceptable.

---

## 11. Quick reference

```bash
# Status
docker compose ps
docker compose logs -f backend

# Restart after .env changes  (restart alone does NOT reload .env)
docker compose up -d backend

# Manual backup
/opt/amstar/scripts/backup-db.sh

# Database shell
docker exec -it amstar_postgres psql -U amstar_user -d amstar_db

# What version of the schema is live
docker exec amstar_postgres psql -U amstar_user -d amstar_db \
  -c "select version, description, success from flyway_schema_history order by installed_rank;"
```
