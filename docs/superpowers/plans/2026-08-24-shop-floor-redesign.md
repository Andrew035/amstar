# Shop Floor / Steel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the AM Star frontend from a light admin-SaaS skin to an industrial dark "Shop Floor / Steel" theme, centralizing the duplicated style constants into one module along the way.

**Architecture:** All color decisions become Tailwind tokens under the existing `amstar` key in `tailwind.config.js`. A new `src/styles/controls.ts` becomes the single source for the five control style strings that are currently copy-pasted across three files, plus the severity color ramp. Pages are then converted one at a time, each verified before moving on.

**Tech Stack:** Vite 8, React 19, TypeScript, Tailwind 3, oxlint. Two new runtime dependencies: `@fontsource-variable/oswald` and `@fontsource/roboto-mono`.

**Spec:** `docs/superpowers/specs/2026-08-24-shop-floor-redesign-design.md`

## Global Constraints

- **Scope is `frontend/` only.** No backend, API, `priorityScore`, or auth changes.
- **Brand colors are frozen:** `amstar-blue` `#0b3068` and `amstar-red` `#d62027` keep their exact values.
- **No `alert()` / `confirm()`.** Existing convention — use `showToast` or inline `error` state.
- **Hand-rolled controls keep their mechanics.** The `getBoundingClientRect()` → `position: fixed` panel at `z-[101]` + `z-[100]` backdrop with `onWheel`/`onTouchMove` pattern is unchanged. Only colors change.
- **No new dropdown libraries.** No state or data-fetching libraries.
- **Layout and information architecture are unchanged.** Only the skin changes.
- **No light/dark toggle.** The app becomes dark, full stop.

### Verification cycle (replaces TDD for this plan)

**This repo has no frontend tests** — `CLAUDE.md` states this explicitly, and CI only runs `npm install && npm run build`. Do **not** invent a test framework for a visual redesign; that is out of scope and would fail review. Every task instead ends with this cycle, run from `frontend/`:

```bash
npm run build      # tsc -b && vite build — the type gate CI enforces
npm run lint       # oxlint
```

...plus the task's own grep sweep and a manual visual check against `npm run dev` at http://localhost:5173.

### Tailwind JIT constraint

Tailwind scans source files for **literal** class strings. Never build a class name by interpolation (`` `bg-sev-${n}` ``) — the class will be purged from the CSS and render as nothing. Always map to complete literal strings, as `getSeverityColor` does in Task 2.

---

### Task 1: Design tokens, fonts, and the global shell

**Files:**
- Modify: `frontend/tailwind.config.js` (full replacement)
- Modify: `frontend/package.json` (add two dependencies)
- Modify: `frontend/src/main.tsx` (add two font imports)
- Modify: `frontend/src/index.css` (full replacement)
- Modify: `frontend/src/App.tsx:221` and `frontend/src/App.tsx:219`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind classes `bg-amstar-ground`, `bg-amstar-surface`, `bg-amstar-raised`, `bg-amstar-field`, `border-amstar-line`, `border-amstar-line-soft`, `text-amstar-ink`, `text-amstar-ink-dim`, `text-amstar-ink-faint`, `bg-sev-1` … `bg-sev-5`, `font-cond`, `font-mono`. Every later task depends on these existing.

- [ ] **Step 1: Install the two font packages**

```bash
cd frontend
npm install @fontsource-variable/oswald @fontsource/roboto-mono
```

These are self-hosted font packages. Do **not** substitute a Google Fonts `<link>` in `index.html` — the spec requires the UI to render correctly without outbound network access.

- [ ] **Step 2: Replace `frontend/tailwind.config.js` entirely**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amstar: {
          blue: "#0b3068",
          red: "#d62027",
          ground: "#13243d",
          surface: "#1b3459",
          raised: "#22406b",
          field: "#162b48",
          line: "#2d5590",
          "line-soft": "#264a7d",
          ink: "#eef3fa",
          "ink-dim": "#a4bcdc",
          "ink-faint": "#7794bf",
        },
        sev: {
          1: "#10b981",
          2: "#38bdf8",
          3: "#f0a02a",
          4: "#fb7d3c",
          5: "#ff3b41",
        },
      },
      fontFamily: {
        cond: ['"Oswald Variable"', "Oswald", '"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Add the font imports to `frontend/src/main.tsx`**

Insert these three lines immediately after `import './index.css';`:

```tsx
import '@fontsource-variable/oswald';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/700.css';
```

- [ ] **Step 4: Replace `frontend/src/index.css` entirely**

Note the existing file has two typos being fixed here: `-apple-system` was listed twice, and `-mox-osx-font-smoothing` was misspelled (should be `-moz-`).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background-color: #13243d;
  color: #eef3fa;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "Roboto",
    "Oxygen",
    "Ubuntu",
    "Cantarell",
    "Fira Sans",
    "Droid Sans",
    "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark scrollbars so browser chrome doesn't stay light against the app. */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: #13243d;
}
::-webkit-scrollbar-thumb {
  background: #2d5590;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3a68a8;
}
* {
  scrollbar-color: #2d5590 #13243d;
}
```

- [ ] **Step 5: Update the app shell in `frontend/src/App.tsx`**

Line 219 — the loading state:

```tsx
  if (loading) return <div className='p-8 text-center text-amstar-ink-dim'>Connecting to AMStar database...</div>
```

Line 221 — the root wrapper:

```tsx
    <div className='min-h-screen bg-amstar-ground'>
```

Leave the inline `<style>` block with `@keyframes slideUp` exactly as-is — the toast animation depends on it and it is not defined in `tailwind.config.js`.

- [ ] **Step 6: Verify the build and the tokens resolve**

```bash
cd frontend && npm run build && npm run lint
```

Expected: both pass. Then `npm run dev` and load http://localhost:5173 — the page background must be dark navy `#13243d`. Pages will still be full of light cards at this point; that is expected and gets fixed in Tasks 3–9.

- [ ] **Step 7: Commit**

```bash
git add frontend/tailwind.config.js frontend/package.json frontend/package-lock.json frontend/src/main.tsx frontend/src/index.css frontend/src/App.tsx
git commit -m "feat(ui): add Shop Floor steel design tokens and self-hosted fonts"
```

---

### Task 2: Centralized control styles module

**Files:**
- Create: `frontend/src/styles/controls.ts`

**Interfaces:**
- Consumes: the Tailwind tokens from Task 1.
- Produces: named exports `SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `NUMBER_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `INLINE_INPUT_STYLE`, `PANEL_STYLE`, `PANEL_HEADING_STYLE`, `FLOATING_PANEL_STYLE`, `PANEL_ROW_STYLE`, `LABEL_STYLE`, `getSeverityColor(severity: number): string`, `getSeverityGlow(severity: number): string`, `getStatusStyle(status?: string): string`. Tasks 3–9 import from here.
- **Every export must have a consumer** by the end of Task 8. `PANEL_HEADING_STYLE` is consumed by Tasks 5 and 6 for table `<th>` cells; `getStatusStyle` by Tasks 5 and 6.

- [ ] **Step 1: Create `frontend/src/styles/controls.ts`**

```ts
// Single source of truth for control styling in the Shop Floor / Steel theme.
// These are exported strings rather than components on purpose: it preserves the
// existing convention of interpolating style constants into `className`, so call
// sites keep their current shape. See CLAUDE.md, "Shared style strings".

const FOCUS =
  "focus:outline-none focus:border-amstar-red focus:ring-2 focus:ring-amstar-red/40";

export const SHARED_INPUT_STYLE =
  `w-full px-4 py-2.5 bg-amstar-field border border-amstar-line rounded text-sm font-medium text-amstar-ink shadow-inner transition-all placeholder:text-amstar-ink-faint ${FOCUS}`;

export const SEARCH_INPUT_STYLE =
  `w-full sm:w-80 px-4 py-2.5 bg-amstar-field border border-amstar-line rounded text-sm font-medium text-amstar-ink shadow-inner transition-all placeholder:text-amstar-ink-faint ${FOCUS}`;

export const NUMBER_INPUT_STYLE =
  `w-24 px-3 py-1.5 bg-amstar-field border border-amstar-line rounded font-mono text-sm font-bold text-amstar-ink tabular-nums shadow-inner transition-all text-right ${FOCUS} disabled:opacity-40 disabled:bg-amstar-surface disabled:cursor-not-allowed`;

export const TABLE_DROPDOWN_STYLE =
  `px-3 py-1.5 bg-amstar-field border border-amstar-line rounded text-xs font-bold text-amstar-ink shadow-inner cursor-pointer transition-all hover:border-amstar-red ${FOCUS}`;

export const INLINE_INPUT_STYLE =
  `px-3 py-1.5 bg-transparent border border-transparent hover:border-amstar-line focus:bg-amstar-field rounded text-xs font-bold text-amstar-ink transition-all cursor-pointer uppercase w-full ${FOCUS}`;

// Static surfaces.
export const PANEL_STYLE =
  "bg-amstar-surface border border-amstar-line rounded";

export const PANEL_HEADING_STYLE =
  "font-cond uppercase tracking-widest text-amstar-ink-dim";

export const LABEL_STYLE =
  "block font-cond uppercase tracking-widest text-[11px] text-amstar-ink-dim mb-1";

// Floating panels rendered at fixed coordinates by the hand-rolled dropdowns.
// Callers still supply `style={{ top, left, width }}` from getBoundingClientRect().
export const FLOATING_PANEL_STYLE =
  "fixed bg-amstar-raised border border-amstar-line shadow-2xl rounded z-[101] overflow-hidden";

export const PANEL_ROW_STYLE =
  "px-4 py-2.5 text-sm font-bold text-amstar-ink hover:bg-amstar-surface cursor-pointer border-b border-amstar-line-soft last:border-0 transition-colors";

// Severity ramp. Level 2 moved from blue to cyan because blue-500 is invisible
// against the navy ground. Keys map to COMPLETE literal class strings — Tailwind
// purges anything built by interpolation, so never write `bg-sev-${severity}`.
const SEVERITY_BG: Record<number, string> = {
  1: "bg-sev-1",
  2: "bg-sev-2",
  3: "bg-sev-3",
  4: "bg-sev-4",
  5: "bg-sev-5",
};

export const getSeverityColor = (severity: number): string =>
  SEVERITY_BG[severity] ?? "bg-amstar-line";

// Level 5 reads as a lit warning lamp; lower levels get no glow.
const LAMP_GLOW =
  "shadow-[0_0_0_3px_rgba(214,32,39,0.22),0_0_10px_2px_rgba(255,59,65,0.75)]";

export const getSeverityGlow = (severity: number): string =>
  severity >= 5 ? LAMP_GLOW : "";

// Ticket status chips. This helper was previously duplicated byte-for-byte in
// ActiveQueue.tsx and History.tsx. Its IN_PROGRESS branch used `bg-blue-500`,
// which has the same invisible-on-navy problem as severity level 2, so the whole
// ramp moves onto the sev tokens. Bright chips take dark text.
export const getStatusStyle = (status?: string): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-sev-3 text-amstar-ground border-sev-3 hover:brightness-110';
    case 'IN_PROGRESS':
      return 'bg-sev-2 text-amstar-ground border-sev-2 hover:brightness-110';
    default:
      return 'bg-sev-1 text-amstar-ground border-sev-1 hover:brightness-110';
  }
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npm run build && npm run lint
```

Expected: both pass. Nothing imports the module yet, so there is no visual change. If `tsc -b` reports the file as unused, that is not an error — unused *exports* are fine; only unused *locals* are flagged.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/controls.ts
git commit -m "feat(ui): add centralized control styles and severity ramp"
```

---

### Task 3: Navbar

**Files:**
- Modify: `frontend/src/components/Navbar.tsx` (full replacement)

**Interfaces:**
- Consumes: Tailwind tokens (Task 1).
- Produces: nothing other tasks import. Props (`isAdmin`, `currentUser`, `onLogout`) are unchanged.

- [ ] **Step 1: Replace the body of `frontend/src/components/Navbar.tsx`**

Keep the imports, the `NavbarProps` interface, and the `draggable={false}` / `select-none` behavior exactly as they are. Replace `linkClass` and the returned JSX:

```tsx
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    // select-none prevents highlighting, transition-all unifies hover effects
    `px-4 py-2 rounded-sm font-cond uppercase tracking-wider text-sm transition-all select-none ${isActive
      ? 'bg-amstar-raised text-white shadow-[inset_0_-2px_0_#d62027]'
      : 'text-amstar-ink-dim hover:bg-amstar-raised/50 hover:text-white'
    }`;

  return (
    <header className="bg-amstar-blue border-b border-amstar-line sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">

        {/* Brand: welded AM badge + wordmark */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 bg-amstar-red rounded-sm grid place-items-center font-cond font-bold text-white text-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.2)]">
            AM
          </div>
          <div>
            <h1 className="font-cond text-lg font-bold text-white tracking-tight leading-none">AM STAR</h1>
            <span className="font-cond text-[10px] font-bold text-amstar-ink-faint tracking-[0.22em] uppercase">Transmissions</span>
          </div>
        </div>

        {/* Navigation Links - draggable={false} stops the ghost dragging! */}
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={linkClass} draggable={false}>Shop Overview</NavLink>
          <NavLink to="/queue" className={linkClass} draggable={false}>Active Queue</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/pricing" className={linkClass} draggable={false}>Pricing Calculator</NavLink>
              <NavLink to="/history" className={linkClass} draggable={false}>Completed History</NavLink>
            </>
          )}
        </nav>

        {/* User Account / Logout */}
        <div className="flex items-center gap-4 select-none">
          <span className="font-cond text-[11px] uppercase tracking-widest bg-amstar-raised border border-amstar-line px-3 py-1.5 rounded-sm text-amstar-ink-dim">
            {isAdmin ? `Admin: ${currentUser}` : `Viewer: ${currentUser}`}
          </span>
          <button
            onClick={onLogout}
            className="font-cond text-[11px] uppercase tracking-widest text-amstar-red hover:text-white bg-transparent hover:bg-amstar-red border border-amstar-red px-4 py-1.5 rounded-sm transition-all"
          >
            Log Out
          </button>
        </div>

      </div>
    </header>
  );
```

- [ ] **Step 2: Verify**

```bash
cd frontend && npm run build && npm run lint
```

Then `npm run dev`, log in, and confirm: navbar is solid `#0b3068`, the AM badge looks beveled, the active link has a red underline rule, and all four links appear for an admin user (`admin1`, `admin2`, or `admin3`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Navbar.tsx
git commit -m "feat(ui): restyle navbar for Shop Floor theme"
```

---

### Task 4: Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `getSeverityColor`, `getSeverityGlow`, `PANEL_STYLE` from `../styles/controls` (Task 2).
- Produces: nothing.

- [ ] **Step 1: Delete the local `getSeverityColor` and import the shared one**

Delete lines 4–14 (the `// === NEW: UNIVERSAL SEVERITY COLOR HELPER ===` comment and the whole local `getSeverityColor` function). Add below the existing imports:

```tsx
import { getSeverityColor, getSeverityGlow, PANEL_STYLE } from '../styles/controls';
```

- [ ] **Step 2: Convert `MonthlyReportCard`**

Apply these exact substitutions inside the `MonthlyReportCard` return block:

| Current | Replacement |
|---|---|
| `bg-white p-6 rounded-xl border border-slate-200 shadow-sm` | `` `${PANEL_STYLE} p-6` `` |
| `border-b border-slate-100 pb-3 mb-4` | `border-b border-amstar-line-soft pb-3 mb-4` |
| `text-lg font-black text-amstar-blue uppercase tracking-tight` | `font-cond text-lg font-bold text-amstar-ink uppercase tracking-wider` |
| `text-xs font-bold text-slate-500 uppercase tracking-widest` | `font-cond text-xs text-amstar-ink-dim uppercase tracking-widest` |
| `bg-sky-100 text-sky-700 font-bold px-3 py-1 rounded-full text-xs` | `bg-amstar-raised text-amstar-ink-dim font-cond uppercase tracking-widest px-3 py-1 rounded-sm text-[11px] border border-amstar-line` |
| `divide-x divide-slate-100` | `divide-x divide-amstar-line-soft` |
| `text-xs font-bold text-slate-400 uppercase tracking-wider mb-1` | `font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1` |
| `text-[10px] text-slate-400 font-medium mt-1` | `text-[10px] text-amstar-ink-faint font-medium mt-1` |
| `text-sm font-bold text-slate-700 leading-tight line-clamp-2` | `text-sm font-bold text-amstar-ink leading-tight line-clamp-2` |

The three big stat numerals need mono + tabular figures. Change each `text-3xl font-black` to `font-mono text-3xl font-bold tabular-nums`, keeping their existing color classes (`text-emerald-600`, `text-blue-600`, and the dynamic `avgTextColor`).

- [ ] **Step 3: Retune `avgTextColor` for the dark ground**

The `text-blue-500` branch is invisible on navy. Replace the block at lines 39–43 with:

```tsx
  let avgTextColor = 'text-sev-1';
  if (avgSeverityNum >= 4.5) avgTextColor = 'text-sev-5';
  else if (avgSeverityNum >= 3.5) avgTextColor = 'text-sev-4';
  else if (avgSeverityNum >= 2.5) avgTextColor = 'text-sev-3';
  else if (avgSeverityNum >= 1.5) avgTextColor = 'text-sev-2';
```

Also change the other two stat colors: `text-emerald-600` → `text-sev-1`, `text-blue-600` → `text-sev-2`.

- [ ] **Step 4: Convert `CircularProgress` into a gauge dial**

Replace the whole component (lines 101–130 pre-edit) with:

```tsx
const CircularProgress = ({ percent, color, label, count }: { percent: number; color: string; label: string; count: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`${PANEL_STYLE} flex flex-col items-center p-6 flex-1`}>
      <svg width="100" height="100">
        <circle stroke="#162b48" fill="transparent" strokeWidth="8" r={radius} cx="50" cy="50" />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth="8"
          r={radius}
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          transform="rotate(-90 50 50)"
        />
        {/* Tick marks at the cardinal points */}
        <g stroke="#2d5590" strokeWidth="1.5">
          <line x1="50" y1="4" x2="50" y2="10" />
          <line x1="96" y1="50" x2="90" y2="50" />
          <line x1="50" y1="96" x2="50" y2="90" />
          <line x1="4" y1="50" x2="10" y2="50" />
        </g>
        <text x="50" y="50" fill="#eef3fa" fontSize="1.5rem" fontWeight="bold" textAnchor="middle" dy=".3em" fontFamily='"Roboto Mono", ui-monospace, monospace'>
          {count}
        </text>
      </svg>
      <div className="font-cond uppercase tracking-widest text-sm text-amstar-ink-dim mt-3 text-center">{label}</div>
    </div>
  );
};
```

- [ ] **Step 5: Update the gauge colors passed in and the two list panels**

At the three `<CircularProgress ... />` call sites, change the `color` props: `"#f59e0b"` → `"#f0a02a"`, `"#3b82f6"` → `"#38bdf8"`, `"#10b981"` stays.

Then apply these substitutions in the `Dashboard` return block:

| Current | Replacement |
|---|---|
| `border-b-2 border-amstar-red pb-2` | unchanged — keep it |
| `text-2xl font-black text-amstar-blue` | `font-cond text-2xl font-bold uppercase tracking-wider text-amstar-ink` |
| `bg-white p-6 rounded-xl border border-slate-200 shadow-sm` (both panels) | `` `${PANEL_STYLE} p-6` `` |
| `text-base font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4` | `font-cond text-base uppercase tracking-widest text-amstar-ink-dim border-b border-amstar-line-soft pb-3 mb-4` |
| `text-base font-bold text-red-600 border-b border-slate-100 pb-3 mb-4` | `font-cond text-base uppercase tracking-widest text-amstar-red border-b border-amstar-line-soft pb-3 mb-4` |
| `text-sm text-slate-400` (both empty states) | `text-sm text-amstar-ink-faint` |
| `divide-y divide-slate-100` (both lists) | `divide-y divide-amstar-line-soft` |
| `bg-blue-500 animate-pulse` | `bg-sev-2 animate-pulse` |
| `font-bold text-slate-800` | `font-bold text-amstar-ink` |
| `text-xs text-slate-500 block` | `text-xs text-amstar-ink-dim block` |
| `text-slate-800 text-sm` (the `<strong>`) | `text-amstar-ink text-sm` |
| `text-xs text-slate-400 block mt-0.5` | `font-mono text-xs text-amstar-ink-faint block mt-0.5 tabular-nums` |

- [ ] **Step 6: Make the critical-pending badge a lamp**

Replace the severity badge span with:

```tsx
                    <span className={`px-2 py-0.5 text-white rounded-sm font-cond text-xs uppercase tracking-wider ${getSeverityColor(item.severity)} ${getSeverityGlow(item.severity)}`}>
                      Level {item.severity}
                    </span>
```

- [ ] **Step 7: Verify**

```bash
cd frontend && npm run build && npm run lint
grep -n 'slate-\|bg-white\|text-blue-600\|text-emerald-600\|sky-100' src/pages/Dashboard.tsx
```

Expected: build and lint pass; the grep returns **no matches**. Then `npm run dev` and load Shop Overview — three gauge dials with tick marks and mono numerals, both list panels dark, and any severity-5 badge visibly glowing.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(ui): convert dashboard to Shop Floor theme with gauge dials"
```

---

### Task 5: Active Queue

**Files:**
- Modify: `frontend/src/pages/ActiveQueue.tsx`

**Interfaces:**
- Consumes: `SEARCH_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `INLINE_INPUT_STYLE`, `FLOATING_PANEL_STYLE`, `PANEL_ROW_STYLE`, `PANEL_STYLE`, `getSeverityColor`, `getSeverityGlow` from `../styles/controls`.
- Produces: nothing.

- [ ] **Step 1: Delete the local constants and helper, import the shared ones**

Delete lines 5–7 (`SEARCH_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `INLINE_INPUT_STYLE`), the local `getSeverityColor` at lines 132–140, and the local `getStatusStyle` at lines 144–150. Add after the existing imports:

```tsx
import {
  SEARCH_INPUT_STYLE,
  TABLE_DROPDOWN_STYLE,
  INLINE_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  getSeverityColor,
  getSeverityGlow,
  getStatusStyle,
} from '../styles/controls';
```

`getStatusStyle` is called at line 179 inside `StatusDropdown`; leave that call site's surrounding classes alone except to change `rounded-lg` → `rounded-sm` and drop `shadow-sm`.

- [ ] **Step 2: Convert the three floating panels**

At lines 44, 119, and 185 (pre-edit), each panel currently begins:

```tsx
<div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden ..."
```

Replace the leading `fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden` with `` `${FLOATING_PANEL_STYLE} ...` ``, preserving each panel's remaining width/height classes exactly:

- Line 44: `` className={`${FLOATING_PANEL_STYLE} w-48`} ``
- Line 119: `` className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} ``
- Line 185: `` className={FLOATING_PANEL_STYLE} ``

Leave every `style={{ top: coords.top, left: coords.left, width: coords.width }}` and `onClick={e => e.stopPropagation()}` untouched. Leave the `z-[100]` backdrops untouched — they are transparent.

- [ ] **Step 3: Convert the option rows inside those panels**

Any row inside a floating panel styled with some combination of `hover:bg-slate-50`, `text-slate-700`, `border-slate-50`, or `border-b border-slate-100` becomes `PANEL_ROW_STYLE`. For rows that also carry layout classes (e.g. `flex items-center gap-2.5`), use `` className={`${PANEL_ROW_STYLE} flex items-center gap-2.5`} ``.

Checkbox-style rows using `hover:bg-slate-50 rounded` become `hover:bg-amstar-surface rounded-sm`.

- [ ] **Step 4: Convert the page chrome and table**

Apply these substitutions across the file:

| Current | Replacement |
|---|---|
| `bg-white` (table/card wrappers) | `bg-amstar-surface` |
| `border-slate-200` | `border-amstar-line` |
| `border-slate-100` / `divide-slate-100` | `border-amstar-line-soft` / `divide-amstar-line-soft` |
| `bg-slate-50` (table header rows, hover rows) | `bg-amstar-raised` |
| `text-slate-800` / `text-slate-700` | `text-amstar-ink` |
| `text-slate-500` / `text-slate-600` | `text-amstar-ink-dim` |
| `text-slate-400` | `text-amstar-ink-faint` |
| `rounded-xl` on panels | `rounded` |
| `text-amstar-blue` on headings | `text-amstar-ink` plus `font-cond uppercase tracking-wider` |

Table `<th>` cells get `PANEL_HEADING_STYLE` (its value is exactly `font-cond uppercase tracking-widest text-amstar-ink-dim`) — import the constant rather than repeating the literal. Any cell rendering an id, priority score, date, VIN, or plate gets `font-mono tabular-nums`.

- [ ] **Step 5: Restore the severity badge with the lamp glow**

At line 263 (pre-edit), replace the badge with:

```tsx
                    <span className={`px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider text-white text-[11px] ${getSeverityColor(item.severity)} ${getSeverityGlow(item.severity)}`}>
```

- [ ] **Step 6: Verify**

```bash
cd frontend && npm run build && npm run lint
grep -n 'slate-\|bg-white' src/pages/ActiveQueue.tsx
```

Expected: build and lint pass; grep returns **no matches**. Then `npm run dev` → Active Queue and **open all three dropdowns** (status, service, technician). Each panel must be `#22406b`, not white. Confirm the panels still close on outside click, scroll wheel, and touch move.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ActiveQueue.tsx
git commit -m "feat(ui): convert active queue to Shop Floor theme"
```

---

### Task 6: Completed History

**Files:**
- Modify: `frontend/src/pages/History.tsx`

**Interfaces:**
- Consumes: the same exports as Task 5.
- Produces: nothing.

- [ ] **Step 1: Delete the local constants and helper, and resolve the name collision**

**Read this step carefully — `History.tsx` contains a naming trap.**

`History.tsx` declares two local constants of its own:

- Line 4: `SEARCH_INPUT_STYLE` — byte-identical to `ActiveQueue.tsx`'s and `Pricing.tsx`'s. Straight swap for the shared one.
- Line 5: `TABLE_DROPDOWN_STYLE` — **a misnomer.** Its value is `"px-3 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white ... cursor-pointer uppercase"`, which is `ActiveQueue.tsx`'s **`INLINE_INPUT_STYLE`**, not its `TABLE_DROPDOWN_STYLE`. The same identifier means two different things in the two files.

So: delete lines 4 and 5, and delete the local `getStatusStyle` at lines 100–106 (byte-identical to `ActiveQueue.tsx`'s). Then rewrite the two usages of the old local `TABLE_DROPDOWN_STYLE` — **line 23** and **line 84** — to use `INLINE_INPUT_STYLE`.

Do **not** import `TABLE_DROPDOWN_STYLE` into this file. Importing it under the old name would silently give History's controls a filled `amstar-field` background where they are meant to be transparent until focused.

```tsx
import {
  SEARCH_INPUT_STYLE,
  INLINE_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  getSeverityColor,
  getSeverityGlow,
  getStatusStyle,
} from '../styles/controls';
```

`tsconfig.app.json` sets `noUnusedLocals: true` and `noUnusedParameters: true`, so any import you do not actually use will **fail the build**. Remove unused ones rather than leaving them.

`getStatusStyle` is called at line 135 inside this file's `StatusDropdown`; change only `rounded-lg` → `rounded-sm` and drop `shadow-sm` at that call site.

- [ ] **Step 2: Convert the three floating panels**

- Line 30: `` className={`${FLOATING_PANEL_STYLE} w-48`} ``
- Line 88: `` className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} ``
- Line 141: `` className={FLOATING_PANEL_STYLE} ``

Preserve each `style={{ ... }}` and `onClick={e => e.stopPropagation()}` exactly.

- [ ] **Step 3: Apply the same substitution table as Task 5, Step 4**

Repeating it here so this task can be read on its own:

| Current | Replacement |
|---|---|
| `bg-white` | `bg-amstar-surface` |
| `border-slate-200` | `border-amstar-line` |
| `border-slate-100` / `divide-slate-100` | `border-amstar-line-soft` / `divide-amstar-line-soft` |
| `bg-slate-50` | `bg-amstar-raised` |
| `text-slate-800` / `text-slate-700` | `text-amstar-ink` |
| `text-slate-500` / `text-slate-600` | `text-amstar-ink-dim` |
| `text-slate-400` | `text-amstar-ink-faint` |
| `rounded-xl` on panels | `rounded` |
| `text-amstar-blue` on headings | `text-amstar-ink` plus `font-cond uppercase tracking-wider` |

Table `<th>` cells get `PANEL_HEADING_STYLE`. Cells rendering ids, scores, dates, VINs, or plates get `font-mono tabular-nums`. Severity badges get `` `${getSeverityColor(n)} ${getSeverityGlow(n)}` ``.

- [ ] **Step 4: Verify**

```bash
cd frontend && npm run build && npm run lint
grep -n 'slate-\|bg-white' src/pages/History.tsx
```

Expected: build and lint pass; grep returns **no matches**. Then log in as an admin (`admin1`), open Completed History, and open all three dropdowns.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/History.tsx
git commit -m "feat(ui): convert completed history to Shop Floor theme"
```

---

### Task 7: Repair form and the segmented severity selector

**Files:**
- Modify: `frontend/src/components/RepairForm.tsx`

**Interfaces:**
- Consumes: `SHARED_INPUT_STYLE`, `FLOATING_PANEL_STYLE`, `PANEL_ROW_STYLE`, `LABEL_STYLE`, `PANEL_STYLE`, `getSeverityColor` from `../styles/controls`.
- Produces: nothing. `SeveritySegments` is local to this file.

- [ ] **Step 1: Delete the local `SHARED_INPUT_STYLE` and import shared styles**

Delete line 3. Add after the existing imports:

```tsx
import {
  SHARED_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  LABEL_STYLE,
  PANEL_STYLE,
} from '../styles/controls';
```

- [ ] **Step 2: Delete `SeverityDropdown` entirely**

Remove the whole `SeverityDropdown` component (lines 110–170 pre-edit, ending at the `};` after its closing `</div>`). This removes one of the ten floating panels; nine remain.

- [ ] **Step 3: Add `SeveritySegments` in its place**

```tsx
const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minor',
  2: 'Low',
  3: 'Moderate',
  4: 'Major',
  5: 'Critical',
};

const SeveritySegments: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const levels = [1, 2, 3, 4, 5];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, level: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? Math.min(5, level + 1) : Math.max(1, level - 1);
      onChange(next);
    }
  };

  return (
    <div role="radiogroup" aria-label="Severity Level" className="flex gap-1.5">
      {levels.map(level => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            title={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={e => handleKeyDown(e, level)}
            className={`flex-1 min-h-[44px] rounded font-cond text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amstar-red/40 ${selected
              ? 'text-white border border-amstar-red bg-amstar-red/[0.16] shadow-[inset_0_0_12px_rgba(214,32,39,0.35)]'
              : 'text-amstar-ink-faint border border-amstar-line hover:border-amstar-red/60'
            }`}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
};
```

`min-h-[44px]` is the tablet touch target the spec requires. `React` is already imported at the top of this file, so no import change is needed.

- [ ] **Step 4: Swap the call site**

At line 383 (pre-edit), replace:

```tsx
          <SeverityDropdown value={severity} onChange={setSeverity} />
```

with:

```tsx
          <SeveritySegments value={severity} onChange={setSeverity} />
```

The props and the value written to state are identical, so `handleSubmit` and the `onAutoSetSeverity={setSeverity}` auto-fill from `ServiceAutocomplete` keep working untouched — auto-fill now lights a segment instead of changing dropdown text.

- [ ] **Step 5: Convert the three remaining floating panels**

- Line 70 (`CustomDatePicker`): `` className={`${FLOATING_PANEL_STYLE} p-4 w-64 select-none`} ``
- Line 225 (`ServiceAutocomplete`): `` className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} ``
- Line 293 (`FormWorkerDropdown`): `` className={`${FLOATING_PANEL_STYLE} w-64`} ``

(Line numbers shift once `SeverityDropdown` is deleted in Step 2 — locate them by the `fixed bg-white border border-slate-200 shadow-2xl` string instead.) Preserve each `style={{ ... }}` and `onClick={e => e.stopPropagation()}`.

- [ ] **Step 6: Convert the form chrome**

| Current | Replacement |
|---|---|
| `bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 overflow-visible` | `` `${PANEL_STYLE} p-6 mb-8 overflow-visible` `` |
| `mt-0 border-b border-slate-100 pb-3 mb-4 text-lg font-bold text-amstar-blue` | `mt-0 border-b border-amstar-line-soft pb-3 mb-4 font-cond text-lg font-bold uppercase tracking-wider text-amstar-ink` |
| `text-red-600 bg-red-50 border border-red-100` (error box) | `text-white bg-amstar-red/20 border border-amstar-red` |
| every `block text-sm font-bold text-slate-600 mb-1` label | `LABEL_STYLE` |
| `font-normal text-xs text-slate-400 ml-2` (the "(Optional)" span) | `font-normal text-xs text-amstar-ink-faint ml-2 normal-case tracking-normal` |
| `border-t border-slate-100` (submit row) | `border-t border-amstar-line-soft` |
| `px-6 py-2.5 bg-amstar-red hover:bg-red-700 text-white rounded-lg shadow-md` | `px-6 py-2.5 bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]` |
| `hover:bg-slate-50 rounded` (worker checkbox rows) | `hover:bg-amstar-surface rounded-sm` |

The VIN input already carries `font-mono`; add `tabular-nums` to it and to the plate and state inputs.

- [ ] **Step 7: Verify**

```bash
cd frontend && npm run build && npm run lint
grep -n 'slate-\|bg-white\|SeverityDropdown' src/components/RepairForm.tsx
```

Expected: build and lint pass; grep returns **no matches** (`SeverityDropdown` must be fully gone). Then `npm run dev` → Active Queue → the intake form and check all of:

- All three dropdowns (date picker, service autocomplete, technician) open dark.
- Severity segments respond to click, and to Left/Right arrows once focused.
- Typing a known service name (one already in the queue) auto-lights the matching severity segment.
- Submitting a ticket still works end to end.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/RepairForm.tsx
git commit -m "feat(ui): convert repair form and replace severity dropdown with segments"
```

---

### Task 8: Login, Register, and Pricing

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/Register.tsx`
- Modify: `frontend/src/pages/Pricing.tsx`

**Interfaces:**
- Consumes: `SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `NUMBER_INPUT_STYLE`, `PANEL_STYLE`, `LABEL_STYLE` from `../styles/controls`.
- Produces: nothing.

- [ ] **Step 1: Convert `Login.tsx`**

Import `{ SHARED_INPUT_STYLE, PANEL_STYLE, LABEL_STYLE }` from `../styles/controls`, then:

| Current | Replacement |
|---|---|
| `bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md` | `` `${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md` `` |
| `w-4 h-8 bg-amstar-red rounded-sm` | `w-11 h-11 bg-amstar-red rounded-sm grid place-items-center font-cond font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]` — and put the text `AM` inside the div |
| `text-3xl font-black text-amstar-blue tracking-tight leading-none` | `font-cond text-3xl font-bold text-amstar-ink tracking-tight leading-none` |
| `text-sm font-semibold text-slate-500 tracking-widest uppercase` | `font-cond text-sm text-amstar-ink-dim tracking-[0.22em] uppercase` |
| `text-xl font-bold text-slate-800 mb-6 text-center` | `font-cond text-xl uppercase tracking-wider text-amstar-ink-dim mb-6 text-center` |
| `bg-red-50 text-red-600 ... border border-red-100` (error) | `bg-amstar-red/20 text-white ... border border-amstar-red` |
| both `block text-sm font-bold text-slate-700 mb-1` labels | `LABEL_STYLE` |
| both long inline input classNames | `SHARED_INPUT_STYLE` |
| `w-full py-3 bg-amstar-blue hover:bg-slate-800 text-white font-bold rounded-lg shadow-md` | `w-full py-3 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]` |
| `mt-6 text-center text-sm text-slate-500` | `mt-6 text-center text-sm text-amstar-ink-dim` |
| `text-amstar-blue font-bold hover:underline` | `text-amstar-red font-bold hover:underline` |

The sign-in button moves from blue to red because `amstar-blue` on `amstar-surface` has almost no contrast.

- [ ] **Step 2: Convert `Register.tsx` the same way**

`Register.tsx` mirrors `Login.tsx`'s structure. Apply the identical table from Step 1 to it, including the button color change and the badge treatment.

- [ ] **Step 3: Convert `Pricing.tsx`**

Delete the local `SEARCH_INPUT_STYLE` (line 5) and `NUMBER_INPUT_STYLE` (line 6), import them from `../styles/controls` along with `PANEL_STYLE` and `LABEL_STYLE`, then apply the Task 5 substitution table to the rest of the file. Currency figures and all three number inputs must carry `font-mono tabular-nums`.

- [ ] **Step 4: Verify**

```bash
cd frontend && npm run build && npm run lint
grep -n 'slate-\|bg-white' src/pages/Login.tsx src/pages/Register.tsx src/pages/Pricing.tsx
```

Expected: build and lint pass; grep returns **no matches**. Then log out and check the Login and Register pages, log back in as `admin1`, and check the Pricing Calculator including editing a number field and saving.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx frontend/src/pages/Pricing.tsx
git commit -m "feat(ui): convert login, register, and pricing to Shop Floor theme"
```

---

### Task 9: Modals, toast, CLAUDE.md, and the final sweep

**Files:**
- Modify: `frontend/src/App.tsx:310-411`
- Modify: `CLAUDE.md` (repo root)

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces: nothing.

- [ ] **Step 1: Convert the deep-dive modal (`App.tsx:311-375`)**

| Current | Replacement |
|---|---|
| `bg-slate-900/60 backdrop-blur-sm` (backdrop) | unchanged — it works on dark |
| `bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-100` | `bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-xl shadow-2xl` |
| `border-b border-slate-100 pb-3 mb-4` | `border-b border-amstar-line pb-3 mb-4` |
| `text-xl font-bold text-amstar-blue` | `font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink` |
| `text-slate-400 hover:text-slate-600 text-2xl` (close ×) | `text-amstar-ink-faint hover:text-amstar-ink text-2xl` |
| `w-full h-64 object-cover rounded-xl mb-4 shadow` | `w-full h-64 object-cover rounded mb-4 border border-amstar-line` |
| `bg-slate-100 rounded-xl ... text-slate-400 font-bold text-sm` (no-photo) | `bg-amstar-field rounded ... text-amstar-ink-faint font-cond uppercase tracking-widest text-sm` |
| every `text-xs text-slate-400 font-bold uppercase block` | `font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block` |
| every `font-bold text-slate-800` | `font-bold text-amstar-ink` |
| `font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700` (VIN) | `font-mono tabular-nums text-xs bg-amstar-field px-2 py-1 rounded text-amstar-ink` |
| `border border-slate-400 bg-slate-100 ... rounded` (plate) | `border border-amstar-line bg-amstar-field ... rounded font-mono tabular-nums` |
| `text-[10px] block text-slate-500` (plate state) | `text-[10px] block text-amstar-ink-dim` |
| `bg-slate-50 p-4 rounded-xl border border-slate-100` (job/severity block) | `bg-amstar-surface p-4 rounded border border-amstar-line` |
| `font-bold text-amstar-red text-base` | unchanged — red on `amstar-surface` reads fine |
| `text-xs font-bold text-slate-600` | `text-xs font-bold text-amstar-ink-dim` |
| `bg-amstar-blue text-white px-2 py-0.5 rounded` (status chip) | `bg-amstar-blue text-white px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider border border-amstar-line` |

- [ ] **Step 2: Convert the delete modal (`App.tsx:378-403`)**

| Current | Replacement |
|---|---|
| `bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4` | `bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-sm shadow-2xl space-y-4` |
| `text-lg font-bold text-red-600 flex items-center gap-2` | `font-cond text-lg font-bold uppercase tracking-wider text-amstar-red flex items-center gap-2` |
| `text-sm text-slate-600 leading-relaxed` | `text-sm text-amstar-ink-dim leading-relaxed` |
| `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold` (Cancel) | `bg-transparent border border-amstar-line hover:bg-amstar-surface text-amstar-ink-dim rounded-sm font-cond uppercase tracking-widest text-xs` |
| `bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold` (Delete) | `bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest text-xs shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]` |

- [ ] **Step 3: Convert the toast (`App.tsx:407`)**

Keep the emerald/red split and the `animate-slide-up` class. Change `rounded-xl` to `rounded-sm`, and the border classes from `border-emerald-500` / `border-red-500` to `border-amstar-line`.

- [ ] **Step 4: Update the `CLAUDE.md` convention**

Under "Frontend conventions", replace this bullet:

```markdown
- **Shared style strings, not components.** Each file declares module-level constants (`SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `NUMBER_INPUT_STYLE`, `INLINE_INPUT_STYLE`) and interpolates them into `className`. They are duplicated per file by design; keep the values in sync when changing input styling.
```

with:

```markdown
- **Shared style strings, not components.** `src/styles/controls.ts` is the single source for control styling: `SHARED_INPUT_STYLE`, `SEARCH_INPUT_STYLE`, `NUMBER_INPUT_STYLE`, `TABLE_DROPDOWN_STYLE`, `INLINE_INPUT_STYLE`, plus `PANEL_STYLE`, `PANEL_HEADING_STYLE`, `LABEL_STYLE`, `FLOATING_PANEL_STYLE`, and `PANEL_ROW_STYLE`. They are exported strings rather than components on purpose — call sites interpolate them into `className`, so styling changes stay a one-line edit without a component rewrite. Import them; never redeclare them per file (they used to be duplicated, and the copies drifted).
- **The theme is dark.** Colors come from the `amstar` Tailwind tokens in `tailwind.config.js` — `ground` / `surface` / `raised` / `field` for the elevation ramp, `line` / `line-soft` for borders, `ink` / `ink-dim` / `ink-faint` for text. `amstar-blue` is now the navbar and chrome; `amstar-red` is reserved for alarm, focus rings, and primary actions. Never introduce a raw `bg-white` or `slate-*` class — there is no light mode to fall back to.
- **Severity colors** come from `getSeverityColor(severity)` in `src/styles/controls.ts`, backed by the `sev-1`…`sev-5` tokens; level 5 also takes `getSeverityGlow` for the lit-lamp treatment. Because Tailwind purges interpolated class names, the helper maps to complete literal strings — never build one with `` `bg-sev-${n}` ``.
```

Also update the "Hand-rolled dropdowns and date picker" bullet: the list of controls should drop `SeverityDropdown` and note that severity is now an inline segmented `radiogroup` in `RepairForm.tsx`.

- [ ] **Step 5: Full-repo sweep**

```bash
cd frontend
grep -rnE 'bg-white|(bg|hover:bg|focus:bg|text|border|divide)-(slate|gray|zinc|red|sky|amber|emerald|blue|orange|green|rose|yellow|indigo)-(50|100|200|300)' --include='*.tsx' src/
```

Expected: **no matches.** The pre-change baseline was 37 `bg-white` occurrences across the frontend. Any hit here is a surface that was missed — fix it before committing.

This is the **widened** pattern from Amendment B. The original narrow version (`bg-white` plus `slate-*` only) let pastel tints on other palettes — `bg-red-50`, `bg-sky-50`, `bg-amber-50`, `bg-blue-50`, `bg-emerald-50` — pass every sweep, and those encode real UI states. Do not narrow it back.

Legitimate survivors, which this pattern deliberately does not match: saturated `-500`/`-600`/`-700` values such as `red-600`/`red-700` on primary action buttons, `emerald-*`/`red-*` on the toast, and `text-emerald-600` on the History total-price cell.

```bash
grep -rn 'z-\[101\]' --include='*.tsx' src/
```

Expected: **no matches.** Every `z-[101]` should now live inside `FLOATING_PANEL_STYLE` in `controls.ts`, so no `.tsx` file should still contain the literal. Any hit here is a floating panel that was missed.

- [ ] **Step 6: Final verification pass**

```bash
cd frontend && npm run build && npm run lint
```

Then `npm run dev` and walk the whole app as `admin1`:

1. Login page, Register page.
2. Shop Overview — gauges, both list panels, monthly report.
3. Active Queue — table plus all three dropdowns opened.
4. Completed History — table plus all three dropdowns opened.
5. Pricing Calculator — search field and all three number inputs.
6. Intake form — date picker, service autocomplete, technician dropdown, severity segments.
7. Deep-dive modal (click a vehicle), delete-confirm modal, and a toast (change a status).

Every floating panel must be `#22406b`. **Nine panels total** — four in `RepairForm.tsx`, minus the deleted `SeverityDropdown`, plus three each in `ActiveQueue.tsx` and `History.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx CLAUDE.md
git commit -m "feat(ui): convert modals and toast, document Shop Floor conventions"
```

---

## Amendment A (mid-execution, after Task 4 review)

**Problem.** Task 4's review computed the contrast of the severity badges: `text-white` over `bg-sev-4` `#fb7d3c` is **2.59:1** and over `bg-sev-5` `#ff3b41` is **3.53:1**, both well under the WCAG AA 4.5:1 floor for small text. All five `sev-*` values are bright, so `text-white` is wrong on every one of them.

This also contradicts a decision already made in this plan: `getStatusStyle` (Task 2) gives bright status chips **dark** text (`text-amstar-ground`) for precisely this reason. Severity badges kept `text-white`, so the two chip families in the same table disagree.

**Fix.** `controls.ts` gains one export:

```ts
// All five sev-* values are bright, so severity chips take dark text — matching
// getStatusStyle's treatment of status chips. Never pair text-white with bg-sev-*.
export const SEVERITY_TEXT = "text-amstar-ground";
```

Every severity badge uses `` `${SEVERITY_TEXT} ${getSeverityColor(n)} ${getSeverityGlow(n)}` `` and **never** `text-white`.

Sites: `Dashboard.tsx` (1, retrofit), `ActiveQueue.tsx` (1, Task 5), `History.tsx` (1, Task 6). `RepairForm.tsx`'s segmented selector is unaffected — its selected segment is `text-white` on a translucent red *fill over a dark ground*, not on a bright `sev-*` background, so it stays as specified.

Task 4b applies this to `controls.ts` and `Dashboard.tsx`. Tasks 5 and 6 adopt it natively.

## Amendment B (mid-execution, after Task 5 review)

**Problem — a hole in the verification design, not in any implementation.** Every task's grep sweep and the Task 9 full sweep search only for `bg-white` and `slate-*`. Light *tints on other palettes* — `bg-red-50`, `bg-sky-50`, `bg-amber-50`, `bg-blue-50`, `bg-emerald-50`, `border-red-100`, `border-emerald-100`, `border-blue-200` — pass through every sweep untouched and render as near-white patches on the dark theme. No task's substitution table covers them.

**Corrected sweep pattern.** Replace the `slate-`/`bg-white` sweep everywhere it appears with:

```bash
grep -rnE 'bg-white|(bg|hover:bg|focus:bg|text|border|divide)-(slate|gray|zinc|red|sky|amber|emerald|blue|orange|green|rose|yellow|indigo)-(50|100|200|300)' --include='*.tsx' src/
```

Legitimate survivors are the saturated `-500`/`-600` values inside helpers being deleted anyway, and `red-600`/`red-700` on the primary action buttons.

**Site inventory and replacements.** These are meaningful UI states, not decoration, so each keeps its meaning:

| File | Current | Meaning | Replacement |
|---|---|---|---|
| `ActiveQueue.tsx:229` | `hover:bg-red-50` | click-to-delete affordance (admin only) | `hover:bg-amstar-red/20` |
| `ActiveQueue.tsx:229` | `bg-sky-50` | row currently open in the deep-dive modal | `bg-amstar-raised` |
| `ActiveQueue.tsx:229` | `bg-amber-50` | **top-priority ticket** (`index === 0 && !searchTerm`) — the next job | `bg-sev-3/20` |
| `History.tsx:197` | `hover:bg-red-50` | click-to-delete affordance | `hover:bg-amstar-red/20` |
| `History.tsx:197` | `bg-sky-50` | row open in the deep-dive modal | `bg-amstar-raised` |
| `RepairForm.tsx:96` | `bg-blue-50 border-blue-200` | "today" in the date picker | `bg-amstar-raised border-amstar-red/50` |
| `Pricing.tsx:44` | `bg-blue-50/40 border-amstar-blue/30` | edited/dirty pricing row | `bg-amstar-raised border-amstar-red/40` |
| `Register.tsx:64` | `bg-emerald-50 text-emerald-600 border-emerald-100` | success message | `bg-sev-1/20 text-sev-1 border-sev-1/50` |

`RepairForm.tsx:117-119` (`bg-emerald-500`/`bg-blue-500`/`bg-amber-500` in the `SeverityDropdown` options array) and `History.tsx:102-104` (local `getStatusStyle`) need no treatment — both are inside code Tasks 7 and 6 delete outright.

**Assignment.** `ActiveQueue.tsx` is already complete, so its three row-highlight fixes are batched into Task 6 alongside `History.tsx`'s two — the same change in two files. Tasks 7 and 8 pick up their own rows above.

## Self-Review Notes

Checked against the spec:

- Token scale → Task 1. Severity ramp incl. the forced level-2 cyan change → Tasks 2, 4, 5, 6.
- Typography (Oswald + Roboto Mono, self-hosted, tabular numerals) → Task 1, applied per-page in Tasks 3–9.
- Centralization of all five constants → Task 2, adopted in Tasks 4–8. `CLAUDE.md` update → Task 9.
- Segmented severity selector incl. keyboard and 44px touch target → Task 7.
- All ten floating panels → Task 5 (3), Task 6 (3), Task 7 (3 + 1 deleted).
- Red focus rings → baked into `FOCUS` in Task 2, so every control inherits them.
- Per-surface treatment for all eight files → Tasks 3–9.
- Verification plan → each task's grep + build, with the full sweep in Task 9, Steps 5–6.

No gaps found. Placeholder scan clean. Names used in later tasks (`getSeverityColor`, `getSeverityGlow`, `FLOATING_PANEL_STYLE`, `PANEL_ROW_STYLE`, `PANEL_STYLE`, `LABEL_STYLE`, `SEVERITY_LABELS`) all match their Task 2 / Task 7 definitions.
