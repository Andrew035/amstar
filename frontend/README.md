# AM Star — Frontend

React 19 + TypeScript + Vite 8 + Tailwind CSS 3. Requires Node `^20.19` or `>=22.12`.

```bash
npm install
npm run dev      # http://localhost:5173, talks to the API at http://localhost:8080
npm run build    # type-check (tsc -b) and build to dist/ — CI runs this
npm run lint     # oxlint
```

There are no frontend tests; `npm run build` is the check.

## Configuration

`VITE_API_URL` sets the API base URL (`src/config.ts`). Unset, it defaults to `http://localhost:8080`. `.env.production` sets it empty, so the production build calls `/api/...` on its own origin through Caddy.

## Deploying

Docker does not build the frontend. On the server, run `npm ci && npm run build` and restart Caddy, which serves `dist/`. See [`../DEPLOY.md`](../DEPLOY.md).

## Layout

```
src/
  App.tsx          all app state, data fetching, mutation handlers, routes
  api.ts           apiFetch — every API call goes through it
  config.ts        API_BASE
  pages/           Dashboard, ActiveQueue, Pricing, History, auth pages
  components/      Navbar, RepairForm, ServicesCell, TicketNotes, CurrencyInput, ...
  lib/             ticketFilters (dashboard filters), floating (dropdown positioning), device
  styles/controls.ts  shared Tailwind class strings — use these, don't redeclare
  types/repair.ts  API types
```

Architecture and conventions are in [`../CLAUDE.md`](../CLAUDE.md).
