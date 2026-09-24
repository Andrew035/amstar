<div align="center">

# AM Star Transmissions — Shop Manager

**Every vehicle in the shop, what it needs, who has it, and when it was promised.**

[amstartransmissions.org](https://amstartransmissions.org) &nbsp;·&nbsp;
React 19 &nbsp;·&nbsp; Spring Boot 4.1 &nbsp;·&nbsp; PostgreSQL 15

</div>

---

Built for AM Star Transmissions, a transmission shop that was running its queue
off a whiteboard. The board worked until it didn't: nobody could tell which car
was most overdue, what a finished job was owed, or which technician was buried.
This replaces it.

It is in production. The shop uses it on an iPad at the counter and on a desktop
in the office, which is why so much of the layout work went into making the same
screens work at 1024px and 1440px without two codebases.

## What it does

**Priority queue.** Open tickets ranked automatically, not by hand. Severity
counts most, then how long the car has been in, then how close the promise date
is — `severity × 20 + daysInSystem × 2 + max(0, 50 − daysUntilDue × 5)`.
Recomputed on every read, never stored, so changing the formula changes the
ranking everywhere at once.

**One-screen dashboard.** Counts of pending, in-progress, overdue, due-soon,
unassigned and critical work, plus technician workload, unbilled completed jobs,
and a live activity feed. Every number is a link to the tickets behind it.
Refreshes each minute and whenever the tab regains focus.

**Tickets that fill themselves in.** Type a 17-character VIN and make, model,
year and a photo arrive from NHTSA and Wikipedia. Services come from the shop's
own catalog, which grows as new work is typed. Vehicles are deduplicated by VIN,
then by plate and state, so a returning car keeps its history.

**Split-view editing.** The queue is a list beside the ticket it selects —
status, severity, due date, technicians, services, notes and parts all in one
pane. No modals stacked on modals.

**Pricing and history.** Retail, lease and labor per ticket, each independently
included or excluded from the invoice. Completed work is a searchable ledger
grouped by month, where any row opens to show what was actually done.

**Two kinds of account.** Managers get everything. A shared shop-floor login is
read-only — and read-only on the server, in `SecurityConfig`, not merely hidden
in the UI.

## Built with

| Layer | |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind 3 — 5,800 lines |
| Backend | Spring Boot 4.1 on Java 17, Spring Security + JWT, JPA — 2,400 lines |
| Database | PostgreSQL 15, schema owned by Flyway (9 migrations) |
| Hosting | AWS EC2, Docker Compose, Caddy for automatic HTTPS |
| Backups | Hourly `pg_dump`, offsite to Backblaze B2, dead-man's switch |

Some deliberate choices worth knowing about:

- **Flyway owns the schema.** Hibernate runs with `ddl-auto=validate` and never
  changes a table — it only checks the entities still match. Every change is a
  new migration file.
- **Rules are enforced twice.** Severity 1–5, valid statuses, non-negative
  prices, completion date implies completed — once in Java for a readable 400,
  once as a database CHECK as the backstop.
- **The controls are hand-rolled.** Native `<select>` and `<input type="date">`
  were replaced because they are unusable on an iPad in a shop.
- **No state library.** One endpoint returns every ticket with a fresh priority
  score; the pages filter it locally.

## Tests

```bash
cd backend && ./mvnw test
```

Unit tests for the priority scoring and worker assignment, plus integration
tests that stand up a real PostgreSQL with Testcontainers and run every Flyway
migration against it. Those cover the schema, the security rules (a shop-floor
account must never be able to write), the full ticket lifecycle, and refusing
bad input with a 4xx rather than a 500.

The frontend is type-checked by `npm run build` and linted with oxlint. CI runs
both on every push to `main`.

## Running it locally

Docker, Java 17, Node 22.

```bash
cp .env.example .env            # fill in every value
docker compose up -d postgres-db backend

cd frontend
npm install
npm run dev
```

API on `:8080`, app on `:5173`. Keep `AMSTAR_CORS_ORIGIN` and `AMSTAR_APP_URL`
pointed at `http://localhost:5173` locally — production values in a local `.env`
are the fastest way to a confusing CORS error.

## Documentation

| | |
|---|---|
| [`RUNBOOK.md`](RUNBOOK.md) | Day to day: shipping changes, staging with real data, testing backups, and the traps |
| [`DEPLOY.md`](DEPLOY.md) | First deploy, disaster recovery, user administration, troubleshooting |
| [`CLAUDE.md`](CLAUDE.md) | Architecture and code conventions |

---

<div align="center">
<sub>Built by Andrew Velasquez</sub>
</div>
