# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Shop-management app for AM Star Transmissions: technicians log incoming vehicles as repair tickets, and a priority queue orders them by severity, age, and how close the due date is.

Two independently-run halves:
- `backend/` — Spring Boot 4.1 / Java 17 / Maven / JPA + PostgreSQL, serving a REST API on `:8080`
- `frontend/` — Vite 8 + React 19 + TypeScript + Tailwind 3 SPA on `:5173`

## Commands

Backend (`cd backend`):
```bash
./mvnw spring-boot:run                                    # run API on :8080 (needs DB env vars, see below)
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

Full stack:
```bash
docker compose up --build       # postgres + backend only; run the frontend with npm run dev
docker compose up postgres-db   # just the DB, then ./mvnw spring-boot:run against it
```

`application.properties` intentionally contains **no datasource config** — it comes from the environment (see `docker-compose.yml`). Running the backend outside Docker requires `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`. Schema is managed by `ddl-auto=update`; there is no migration tool, so entity field changes are applied to the live DB automatically and column drops/renames must be handled by hand.

## Architecture

### One endpoint feeds everything
`GET /api/repairs/queue` returns **all** tickets (`repository.findAll()`), including `COMPLETED` ones, each with a freshly computed `priorityScore`, sorted descending. `VehicleRepairRepository.findByStatusNot` exists but is never called. The frontend fetches this single list once into `App.tsx` and each page filters it locally — `ActiveQueue` shows non-completed, `History` shows completed. Don't add per-page fetches; extend this list or filter it client-side.

### priorityScore is computed, never stored
`VehicleRepair.priorityScore` is `@Transient`. `PriorityQueueService.calculatePriorityScore` recomputes it on every queue read:
`severity * 20 + daysInSystem * 2 + max(0, 50 - daysUntilDue * 5)`. Changing the ranking means changing that one method.

### All state and all mutations live in App.tsx
`App.tsx` owns `repairs`, `currentUser`, the toast, and the two global modals (delete confirm, vehicle "deep dive"). Every mutation handler (`handleStatusChange`, `handleAssignWorker`, `handleServiceChange`, `handleSavePricing`, `confirmDelete`) is defined there, PATCHes/DELETEs, then calls `fetchQueue()` to refetch. Pages under `src/pages/` are presentational and receive data plus callbacks as props. There is no state library, no data-fetching library, and no API client module — adding a mutation means adding a handler in `App.tsx` and threading it down.

### Auth is JWT, and the admin check is client-side only
- The HS256 signing key is the hardcoded `JwtAuthenticationFilter.SECRET` constant; `AuthController` imports that same constant so both halves share it. Tokens last 10 hours.
- The frontend stores the token in `localStorage` under `amstar_token` and decodes the payload with `atob(token.split('.')[1])` to learn the username — there is no `/api/auth/me` endpoint.
- **Admin status is `['admin1','admin2','admin3'].includes(currentUser)` in `App.tsx`.** The backend does no role enforcement at all: every `/api/repairs/**` endpoint requires only a valid token, and `User.role` is always set to `"TECHNICIAN"` at registration. Admin-gated UI (pricing, history, delete, status/service edits) is cosmetic — assume any logged-in user can call those endpoints directly.
- CORS is pinned to `http://localhost:5173` in `SecurityConfig`; `VehicleRepairController` additionally carries a redundant `@CrossOrigin(origins = "*")`.
- The API base URL `http://localhost:8080` is hardcoded in `App.tsx`, `RepairForm.tsx`, `Login.tsx`, and `Register.tsx`. Changing hosts means editing all four.

### Comma-delimited multi-value fields
`serviceType` and `assignedWorker` are single `String` columns that hold comma-separated lists ("OIL CHANGE, TIRE ROTATION", "Technician 1, Technician 2"). Everything that touches them does `.split(',').map(s => s.trim()).filter(Boolean)`. Service names are normalized to uppercase.

`App.tsx` derives `historicalServiceMap` from this: a `Record<UPPERCASE_SERVICE_NAME, severity>` built by walking tickets newest-id-first, so each service maps to the severity it was most recently given. It is passed into the service autocompletes, which use it both for suggestions and to auto-fill the severity dropdown when a known service is picked.

### VIN enrichment happens in the browser, not the backend
`RepairForm.handleSubmit` calls the NHTSA vPIC API to decode a 17-character VIN into make/model/year, then Wikipedia's opensearch + summary APIs to find a photo URL, and POSTs the fully-populated nested `vehicle` object. `VehicleLookupService.enrichVehicleData` on the backend is an empty stub — it does nothing. Failures are swallowed and fall back to `"Unknown Vehicle"`.

`VehicleRepair.vehicle` is a `@ManyToOne(cascade = ALL)`, so posting a ticket inserts a new `vehicles` row every time; vehicles are never looked up or deduplicated across tickets.

## Frontend conventions

- **Hand-rolled dropdowns and date picker.** Native `<select>` and `<input type="date">` were deliberately replaced (`CustomDatePicker`, `SeverityDropdown`, `ServiceAutocomplete`, `StateSearch`, `MultiWorkerDropdown`, `EditableServiceCell`). The shared pattern: capture `getBoundingClientRect()` on open, render the panel `position: fixed` at those coords with `z-[101]`, and put a full-screen click-catching backdrop at `z-[100]` that also closes on `onWheel`/`onTouchMove`. Match this when adding another custom control — a panel inside an overflow-hidden table cell will otherwise clip.
- **Shared style strings, not components.** Each file declares module-level constants (`SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `NUMBER_INPUT_STYLE`, `INLINE_INPUT_STYLE`) and interpolates them into `className`. They are duplicated per file by design; keep the values in sync when changing input styling.
- **Brand colors** are the Tailwind extensions `amstar-blue` (#0b3068) and `amstar-red` (#d62027) from `tailwind.config.js`.
- **No `alert()` / `confirm()`.** These were all replaced with `showToast(message, 'success' | 'error')` from `App.tsx`, the delete-confirmation modal, or inline `error` state in forms. Don't reintroduce them.

## CI

`.github/workflows/ci.yml` runs `mvn clean test` in `backend/` and `npm install && npm run build` in `frontend/` on pushes and PRs to `main`. Type errors fail the frontend job (`build` runs `tsc -b` first).
