# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Shop-management app for AM Star Transmissions. Managers log incoming vehicles as repair tickets, a priority queue orders them by severity, age, and how close the due date is, and a dashboard shows the whole shop at a glance.

Three pieces:
- `backend/` — Spring Boot 4.1 / Java 17 / Maven / JPA + PostgreSQL, REST API on `:8080`
- `frontend/` — Vite 8 + React 19 + TypeScript + Tailwind 3 SPA on `:5173`
- `Caddyfile` + `caddy/` — production reverse proxy (TLS, rate limits, serves `frontend/dist`)

Production deploy, backups, and recovery are documented in `DEPLOY.md`.

## Commands

Backend (`cd backend`):
```bash
./mvnw spring-boot:run                                    # run API on :8080 (needs env vars, see below)
./mvnw test                                               # all tests
./mvnw test -Dtest=PriorityQueueServiceTest               # one test class
./mvnw test -Dtest=PriorityQueueServiceTest#testHigherSeverityYieldsHigherScore
./mvnw clean package                                      # build target/repair-service-0.0.1-SNAPSHOT.jar
```

Frontend (`cd frontend`):
```bash
npm run dev      # dev server on :5173
npm run build    # tsc -b && vite build — this is what CI checks; there are no frontend tests
npm run lint     # oxlint (not eslint)
```
Vite 8 needs Node `^20.19` or `>=22.12` (CI uses 22).

Full stack:
```bash
cp .env.example .env                      # fill in the values first
docker compose up --build                 # postgres + backend + caddy (caddy needs frontend/dist built)
docker compose up postgres-db backend     # API only; run the frontend with npm run dev
```

### Environment
`application.properties` holds **no secrets and no datasource config** — they come from the environment (`.env` → `docker-compose.yml`). The backend refuses to start without:
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- `AMSTAR_SIGNUP_CODE` — shared code required to register
- `AMSTAR_JWT_SECRET` — at least 32 bytes, checked at startup by `JwtKeyProvider`
- `AMSTAR_SMTP_USER`, `AMSTAR_SMTP_PASSWORD` — Gmail App Password, used for password reset emails

Optional, with localhost defaults: `AMSTAR_CORS_ORIGIN`, `AMSTAR_APP_URL` (where reset links point), `AMSTAR_SMTP_HOST`, `AMSTAR_SMTP_PORT`.

The Postgres container publishes **no port**, so `./mvnw spring-boot:run` on the host cannot reach it. Either run the backend in Docker too, or add a port in a local `docker-compose.override.yml` (gitignored).

## Architecture

### Schema is owned by Flyway
`spring.jpa.hibernate.ddl-auto=validate`: Hibernate never changes the database, it only checks that entities match it. Every schema change is a new file in `backend/src/main/resources/db/migration/` (`V7__...sql` next). Never edit a migration that has already run anywhere — Flyway checksums them and the backend will refuse to start.

| Migration | Adds |
|---|---|
| V1 | users, customers, vehicles, service_tickets, technicians, services, join tables, CHECK constraints, `updated_at` triggers |
| V2 | seed service catalog (and placeholder technicians) |
| V3 | the real technician roster |
| V4 | password_reset_tokens |
| V5 | `service_tickets.notes` |
| V6 | ticket_activity (dashboard feed) |

Many rules are enforced twice — once in Java for a readable 400, once as a database CHECK as the backstop (severity 1–5, status values, non-negative prices, notes ≤ 5000, uppercase service names, completion date ⇔ COMPLETED). Keep the pair in sync when changing one.

### One endpoint feeds the ticket views
`GET /api/repairs/queue` returns **all** tickets (`repository.findAll()`), including `COMPLETED` ones, each with a freshly computed `priorityScore`, sorted descending. `App.tsx` fetches it once and every page filters locally — `Dashboard` and `ActiveQueue` use non-completed tickets, `History` uses completed. Don't add per-page ticket fetches; extend this list or filter it client-side.

`App.tsx` also loads `GET /api/technicians` and `GET /api/services` (reference data) and `GET /api/activity` (last 30 events). The queue and activity refetch every 60 s and whenever the tab becomes visible again.

### priorityScore is computed, never stored
`VehicleRepair.priorityScore` is `@Transient`. `PriorityQueueService.calculatePriorityScore` recomputes it on every queue read:
`severity * 20 + daysInSystem * 2 + max(0, 50 - daysUntilDue * 5)`. Changing the ranking means changing that one method.

### Tickets are normalized; the API still speaks comma strings
In the database a ticket links to real rows: `vehicles`, `customers`, and the `ticket_services` / `ticket_technicians` join tables. Over the API, `VehicleRepair` still exposes `serviceType`, `assignedWorker`, and `customerName` as flat strings ("OIL CHANGE, TIRE ROTATION", "Max, Brian") through `@JsonProperty` getters and `@Transient` input fields.

`TicketAssemblyService` converts between the two, and every ticket write goes through it:
- **Vehicles are deduplicated** — matched by 17-char VIN, then by plate + state, otherwise inserted. A known car only has blank fields filled in.
- **Customers** are matched by name (case-insensitive) or created.
- **Services** are uppercased; an unknown name joins the catalog with the ticket's severity as its default. Names over 80 chars are rejected.
- **Technicians** must already exist on the roster. Unknown names are silently dropped — the roster is managed data, not something a ticket write can invent.

On the frontend, anything that reads these strings does `.split(',').map(s => s.trim()).filter(Boolean)`. `historicalServiceMap` in `App.tsx` is `Record<SERVICE_NAME, defaultSeverity>` built from the service catalog; the repair form uses it to suggest services and auto-set severity to the highest one picked.

### Every mutation lives in App.tsx and PriorityQueueService
Frontend: `App.tsx` owns `repairs`, `technicians`, `serviceCatalog`, `activity`, the current user/role, the toast, and the two global modals (delete confirm, vehicle "deep dive"). Mutation handlers (`handleStatusChange`, `handleSeverityChange`, `handleAssignWorker`, `handleServiceChange`, `handleSaveNotes`, `handleSavePricing`, `confirmDelete`) PATCH/DELETE through `apiFetch` and then call `fetchQueue()`. Pages under `src/pages/` are presentational and receive data plus callbacks as props. There is no state or data-fetching library — adding a mutation means a handler in `App.tsx` threaded down as a prop.

Backend: each write is a `@Transactional` method on `PriorityQueueService` that also calls `ActivityService.record(...)` when something actually changed, so an activity row exists only if its change was committed. `ticket_activity.ticket_label` is a snapshot ("2010 FORD E-250 — Kane") so deleted tickets still read correctly. Pricing events deliberately carry no amount, because shop-view users can read the feed. New actions must also be added to the `activity_action_valid` CHECK (via a new migration).

Ticket endpoints, all under `/api/repairs`: `GET /queue`, `POST /`, `PATCH /{id}/status|severity|assign|service|notes|pricing`, `DELETE /{id}`.

### API client
`src/api.ts` `apiFetch<T>(path, init)` is the one way to call the API: it attaches the bearer token, sets JSON headers, forces a logout on 401, turns 403/429 into friendly messages, surfaces the backend's `{"error": "..."}` text as `ApiError.message`, and tolerates empty 200 bodies. Show failures with `toastError(error, fallback)`. (`RepairForm`'s ticket POST still uses raw `fetch` — migrate it rather than copying it.)

`src/config.ts` `API_BASE` is `VITE_API_URL`, defaulting to `http://localhost:8080` in dev. `frontend/.env.production` sets it empty, so production calls are same-origin `/api/...` through Caddy and CORS never applies.

### Auth and roles
- Register requires the shared `AMSTAR_SIGNUP_CODE`. An email listed in `amstar.auth.admin-emails` (`application.properties`) gets role `ADMIN`; everyone else gets `SHOP_VIEW`. The role is assigned **only at registration**.
- Login issues a 10-hour HS256 JWT (subject = email local part, plus `role` and `email` claims) signed with `AMSTAR_JWT_SECRET` via `JwtKeyProvider`. Inactive users (`users.is_active = false`) cannot log in.
- **Roles are enforced on the server** in `SecurityConfig`: any signed-in user may `GET` tickets, technicians, services, and activity; every write under `/api/repairs/**`, `/api/technicians/**`, `/api/services/**` requires `ADMIN`. `/api/auth/**` is public.
- The frontend stores the token in `localStorage` as `amstar_token` and decodes the payload for username and role. `isAdmin` in `App.tsx` only hides UI (pricing, history, editing, the new-ticket form) — it is not the security boundary.
- Password reset: `PasswordResetService` stores only a SHA-256 hash of a single-use token that expires in 30 min, and `/forgot-password` always returns 200 so it can't be used to discover accounts.

### Errors
`GlobalExceptionHandler` maps validation, unreadable JSON, `IllegalArgumentException`, and type mismatches to 400 with `{"error": "..."}`; DB constraint violations to 409; Spring's own 404/405 keep their status; anything else is a logged, opaque 500. Throw `IllegalArgumentException` with a user-readable message for bad input.

### VIN enrichment happens in the browser
`RepairForm.handleSubmit` calls NHTSA vPIC to decode a 17-character VIN into make/model/year, then Wikipedia's opensearch + summary APIs for a photo URL, and POSTs the populated `vehicle` object. `VehicleLookupService.enrichVehicleData` on the backend is an empty stub. Lookup failures fall back to `"Unknown Vehicle"`.

### Dashboard
`src/pages/Dashboard.tsx` is built to fit one screen with no page scroll (`sm:h-[calc(100dvh-129px)]`): a strip of `StatTile`s over a grid of `Panel`s whose bodies scroll internally. Tiles and panel headings link to `/queue?filter=...` (or `/pricing?filter=unbilled`). `parseTicketFilter` in `src/lib/ticketFilters.ts` turns that param into a predicate plus banner label (`tech:<name>`, `overdue`, `due-today`, `due-tomorrow`, `due-soon`, `unassigned`, `pending`, `in-progress`, `unbilled`, `critical`); `ActiveQueue` and `Pricing` show a `FilterBanner` and hide the new-ticket form while filtered. Put new ticket predicates in `ticketFilters.ts`, not inline in a page.

## Frontend conventions

- **Hand-rolled dropdowns and date picker.** Native `<select>` and `<input type="date">` were deliberately replaced: `CustomDatePicker`, `ServicePicker`, `StateSearch`, `FormWorkerDropdown` (in `RepairForm.tsx`), `MultiWorkerDropdown`, `StatusDropdown`, `SeverityDropdown` (in `ActiveQueue.tsx`; `History.tsx` has its own copies), and the `ServicesCell` modal. Severity on the form is an inline segmented `radiogroup` (`SeveritySegments`) with roving `tabIndex` and arrow keys. The shared pattern: on open, pass the trigger's `getBoundingClientRect()` to `panelCoords()` in `src/lib/floating.ts` (flips above when there's no room, measures `visualViewport` for iPad), render the panel `position: fixed` with `FLOATING_PANEL_STYLE` (`z-[101]`), and add a full-screen click-catching backdrop at `z-[100]` that also closes on `onWheel`/`onTouchMove`. A panel inside an overflow-hidden table cell will otherwise clip.
- **Touch devices.** The app is used on iPads. `isTouchDevice` (`src/lib/device.ts`) detects no-hover devices by pointer capability, not width — an iPad in landscape is as wide as a laptop. Don't rely on hover to reveal anything; hover-only tooltips need a tap alternative (see `Truncated` / `useTruncationTooltip`). Keep tap targets at least `min-h-10`/`min-h-11`, and don't autofocus text inputs on touch (the keyboard covers the panel).
- **Shared style strings, not components.** `src/styles/controls.ts` is the single source for control styling: `SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `NUMBER_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `INLINE_INPUT_STYLE`, `PANEL_STYLE`, `PANEL_HEADING_STYLE`, `LABEL_STYLE`, `FLOATING_PANEL_STYLE`, `PANEL_ROW_STYLE`, `SEVERITY_TEXT`, `SEVERITY_LABELS`, and the helpers `getSeverityColor`, `getSeverityGlow`, `getStatusStyle`. Call sites interpolate them into `className`, so styling changes stay a one-line edit. Import them; never redeclare them per file.
- **The theme is dark.** Colors come from the `amstar` Tailwind tokens in `tailwind.config.js` — `ground` / `surface` / `raised` / `field` for the elevation ramp, `line` / `line-soft` for borders, `ink` / `ink-dim` / `ink-faint` for text. `amstar-blue` is the navbar and chrome; `amstar-red` is reserved for alarm, focus rings, and primary actions. Never introduce a raw `bg-white` or `slate-*` class. The one deliberate exception is `bg-slate-900/60` on the modal backdrops (`App.tsx` delete and deep-dive modals, `ServicesCell.tsx`): a translucent near-black scrim works over a dark app. `amstar-red` (#d62027) is a fill colour — as *text* on a dark ground it fails WCAG AA. Red text must use `text-amstar-red-ink` (#ff9ca0).
- **Severity colors** come from `getSeverityColor(severity)`, backed by the `sev-1`…`sev-5` tokens; level 5 also takes `getSeverityGlow`. Tailwind purges interpolated class names, so the helper maps to complete literal strings — never build `` `bg-sev-${n}` ``. Severity chips pair the background with `SEVERITY_TEXT` (`text-black`), never `text-white`. Don't use a `sev-*` token as text over a translucent tint of itself (e.g. `text-sev-1` on `bg-sev-1/20`) — it fails AA.
- **Money.** Prices are `numeric(10,2)` / `BigDecimal` on the backend. Enter them with `CurrencyInput`, and total them with `invoiceTotal` from `ticketFilters.ts`, which honors the `include*` flags.
- **Fonts** are self-hosted via `@fontsource` (imported in `main.tsx`): `font-cond` (Oswald) for headings and labels, `font-mono` (Roboto Mono) for numbers.
- **No `alert()` / `confirm()`.** Use `showToast(message, 'success' | 'error')` / `toastError` from `App.tsx`, a modal, or inline `error` state in forms.

## Tests and CI

Backend tests (`PriorityQueueServiceTest`, `AssignWorkerTest`) are plain JUnit + Mockito with no Spring context or database. `PriorityQueueService` takes five constructor arguments (`VehicleRepairRepository`, `VehicleLookupService`, `TicketAssemblyService`, `ActivityService`, `VehicleRepository`) — mock all five when constructing it.

`.github/workflows/ci.yml` runs `mvn clean test` in `backend/` and `npm install && npm run build` in `frontend/` on pushes and PRs to `main`. Type errors fail the frontend job (`build` runs `tsc -b` first). CI does not run `npm run lint` — run it locally.
