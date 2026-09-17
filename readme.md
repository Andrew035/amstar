# AM Star Transmissions — Shop Manager

A web app for AM Star Transmissions to keep track of the vehicles in the shop: what work each one needs, who is working on it, when it is promised, and what it will cost.

## Features

- **Priority queue** — open tickets ranked automatically by severity, how long the car has been in, and how close it is to its due date.
- **Dashboard** — one screen, no scrolling: pending and in-progress counts, overdue and due-soon jobs, unassigned and critical work, technician workload, completed-but-not-billed tickets, and a live activity feed. Tap any number to open the matching tickets. Refreshes every minute.
- **Repair tickets** — look up a vehicle by VIN (make, model, year, and photo filled in automatically), pick services from the shop's catalog, assign one or more technicians, and keep notes.
- **Pricing** — retail, lease, and labor amounts per ticket, with the choice of which ones to invoice.
- **History** — completed work, searchable.
- **Accounts** — managers get full access; a shared shop-floor account is read-only. Registration needs the shop's signup code, and forgotten passwords are reset by email.
- **Works on iPad** as well as desktop.

## Tech stack

| Part | Built with |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 3 |
| Backend | Spring Boot 4.1 (Java 17), Spring Security with JWT, JPA |
| Database | PostgreSQL 15, schema managed by Flyway |
| Hosting | Docker Compose, Caddy (automatic HTTPS) |
| Backups | Hourly `pg_dump`, copied offsite to Backblaze B2 |

## Running it locally

Requires Docker, Java 17, and Node 22.

```bash
cp .env.example .env                        # fill in the values
docker compose up --build postgres-db backend   # API on http://localhost:8080

cd frontend
npm install
npm run dev                                 # app on http://localhost:5173
```

## Documentation

- [`DEPLOY.md`](DEPLOY.md) — putting it on a server, updates, backups, disaster recovery, user administration, troubleshooting
- [`CLAUDE.md`](CLAUDE.md) — architecture and code conventions for developers
