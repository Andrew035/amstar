# Shop Floor / Steel, Frontend Visual Redesign

**Date:** 2026-08-24
**Scope:** `frontend/` only. No backend, API, or data-model changes.

## Goal

Replace the app's generic admin-SaaS skin with an industrial "shop floor" aesthetic
appropriate to a transmission shop, while preserving both brand colors exactly:
`amstar-blue` `#0b3068` and `amstar-red` `#d62027`.

The core inversion: **blue becomes the ground rather than an accent, and red is
reserved strictly as the alarm signal**, high severity, overdue, destructive
actions, and focus. Today red appears only as a decorative 4px bar and on delete
buttons; blue appears only as heading text. After this change both colors carry
structural meaning.

Target: desktop-primary, tablet-capable. Ground tone is A2 "Steel", a visibly
blue navy rather than near-black, chosen for comfort over an eight-hour shift.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Direction | A, Shop Floor (industrial dark) | Selected over Work Order (paper) and Garage Bay (light re-skin) |
| Ground tone | A2 Steel `#13243d` | Reads as brand navy, not black; softer contrast than A1 Deep `#0a1526` |
| Style constants | Centralize into one module | Explicitly approved; see "Centralization" below |
| Severity control | Replace dropdown with 1–5 segments | One click instead of two; lit segment carries the warning-lamp motif |
| Fonts | Self-hosted via `@fontsource` | No runtime CDN dependency |

## Token Scale

Added to `tailwind.config.js` under the existing `amstar` color key. Defining the
ground as tokens rather than literals means the tone is adjustable in one place.

| Token | Value | Role |
|---|---|---|
| `amstar-blue` | `#0b3068` | Unchanged. Navbar and deepest chrome. |
| `amstar-red` | `#d62027` | Unchanged. Alarm, focus rings, primary action. |
| `amstar-ground` | `#13243d` | Page background |
| `amstar-surface` | `#1b3459` | Cards, panels, table bodies |
| `amstar-raised` | `#22406b` | Floating panels and modals |
| `amstar-field` | `#162b48` | Input interiors, recessed, darker than surface |
| `amstar-line` | `#2d5590` | Panel borders |
| `amstar-line-soft` | `#264a7d` | Row dividers |
| `amstar-ink` | `#eef3fa` | Primary text |
| `amstar-ink-dim` | `#a4bcdc` | Labels, secondary text |
| `amstar-ink-faint` | `#7794bf` | Placeholders, disabled |

### Severity ramp

The current ramp is duplicated verbatim in `Dashboard.tsx:5` and
`ActiveQueue.tsx:132`. Both move to a single exported helper.

| Level | Current | New | Note |
|---|---|---|---|
| 1 | `bg-emerald-500` | `#10b981` | unchanged |
| 2 | `bg-blue-500` | `#38bdf8` | **must change**, `blue-500` is invisible on a navy ground |
| 3 | `bg-amber-500` | `#f0a02a` | unchanged |
| 4 | `bg-orange-500` | `#fb7d3c` | unchanged |
| 5 | `bg-red-600` | `#ff3b41` + glow ring | brightened so it reads as a lit lamp |

Level 5 renders as a lamp: a filled dot with
`box-shadow: 0 0 0 3px rgba(214,32,39,.22), 0 0 10px 2px rgba(255,59,65,.75)`.

### Typography

- Headings and labels: Oswald (`@fontsource-variable/oswald`), uppercase,
  `letter-spacing: .04em`. Fallback `'Barlow Condensed', 'Arial Narrow', sans-serif`.
- Numerals: Roboto Mono (`@fontsource/roboto-mono`) with `font-variant-numeric:
  tabular-nums`, applied to ticket IDs, VINs, plates, dates, and priority scores.
  Tabular figures matter here specifically because `priorityScore` is recomputed
  on every `fetchQueue()` and re-renders with different digit widths, causing
  visible column jitter today.
- Body text keeps the existing system stack.

Both packages are added as `frontend/package.json` dependencies and imported in
`src/main.tsx`, so no outbound network request is needed to render the UI.

## Centralization

New module `frontend/src/styles/controls.ts`.

Currently five style constants are copy-pasted across three files, each hardcoding
`bg-white border-slate-300 text-slate-800`:

- `SHARED_INPUT_STYLE`, `RepairForm.tsx:3`
- `SEARCH_INPUT_STYLE`, `Pricing.tsx:5` **and** `ActiveQueue.tsx:5` (identical copies)
- `NUMBER_INPUT_STYLE`, `Pricing.tsx:6`
- `TABLE_DROPDOWN_STYLE`, `ActiveQueue.tsx:6`
- `INLINE_INPUT_STYLE`, `ActiveQueue.tsx:7`

`controls.ts` exports these five plus:

- `PANEL_STYLE`, card/panel chrome (`bg-amstar-surface border-amstar-line`)
- `FLOATING_PANEL_STYLE`, the `position: fixed` dropdown panel chrome
- `getSeverityColor(severity: number)`, the single ramp
- `SEVERITY_LAMP_STYLE`, the glow treatment for level 5

These remain **exported strings, not React components**. That preserves the
existing convention, keeps call sites unchanged in shape, and makes adoption a
mechanical substitution rather than a component rewrite. The only thing that
changes is that there is one copy instead of six.

`CLAUDE.md` must be updated: its "Shared style strings, not components" section
currently documents the per-file duplication as intentional, which stops being
true. The convention becomes "shared style strings, imported from
`src/styles/controls.ts`".

## Severity Segmented Selector

`SeverityDropdown` in `RepairForm.tsx` is replaced by an inline 1–5 segmented
control. This is the one behavioral change in the redesign.

- Five equal-width segments, labelled `1`–`5`, rendered inline in the form grid.
- Selected segment: white text, red border, `rgba(214,32,39,.16)` fill, inset glow.
- Unselected: `amstar-ink-faint` text on `amstar-line` border.
- Keyboard: segments are `<button type="button">` elements in a
  `role="radiogroup"`; left/right arrows move selection.
- Tablet: minimum 44px touch height.

The component's props and the value it writes to form state are unchanged, so
`handleSubmit` and the `historicalServiceMap` auto-fill behavior (which sets
severity when a known service is picked) continue to work untouched, auto-fill
sets the same state, it just lights a segment instead of changing dropdown text.

## Floating Panels

The highest-risk part of the change. Ten panels render `position: fixed` at
`z-[101]` with a hardcoded `bg-white border-slate-200`. Any one missed renders as
a white rectangle punched through a dark app.

Full inventory:

| File | Lines | Control |
|---|---|---|
| `RepairForm.tsx` | 70, 154, 225, 293 | `CustomDatePicker`, `SeverityDropdown`*, `ServiceAutocomplete`, `MultiWorkerDropdown` |
| `ActiveQueue.tsx` | 44, 119, 185 | status dropdown, service autocomplete, worker dropdown |
| `History.tsx` | 30, 88, 141 | status dropdown, service autocomplete, worker dropdown |

\* `RepairForm.tsx:154` is removed outright by the segmented selector, leaving nine.

All nine adopt `FLOATING_PANEL_STYLE`. The `z-[100]` backdrop stays transparent
and keeps its `onWheel`/`onTouchMove` close handlers, no visual change there.

There are 37 total `bg-white` occurrences across `frontend/src`; all must be
audited, not just the ten panels.

## Per-Surface Treatment

- **`Navbar.tsx`**, `amstar-blue` bar; the red rectangle becomes a welded AM badge
  (`inset` bevel shadow); active link gets `amstar-raised` fill with a red bottom rule.
- **`Dashboard.tsx`**, `CircularProgress` gains four tick marks at the cardinal
  points and a mono center numeral; `MonthlyReportCard` divider rules move to
  `amstar-line-soft`; critical-pending badges become lamps.
- **`ActiveQueue.tsx` / `History.tsx`**, `amstar-surface` table on `amstar-ground`;
  `amstar-line-soft` row dividers; mono for IDs, scores, and dates.
- **`RepairForm.tsx`**, recessed `amstar-field` inputs, red focus rings, condensed
  uppercase labels, segmented severity.
- **`Login.tsx` / `Register.tsx`**, `amstar-surface` card centered on `amstar-ground`.
- **`App.tsx`**, deep-dive modal (`:318`) and delete modal (`:380`) move from
  `bg-white rounded-2xl` to `amstar-raised`; the `slate-900/60 backdrop-blur-sm`
  backdrop is kept as-is; the toast (`:407`) keeps emerald/red but gains
  `amstar-line` borders.
- **`index.css`**, `body` background set to `amstar-ground`, font stacks declared,
  and a dark scrollbar (`::-webkit-scrollbar`) so the browser chrome doesn't stay
  light against the app.

### Focus rings

Every focus state currently uses `focus:ring-amstar-blue/20`, which is invisible
on a navy ground. All focus rings move to `focus:ring-amstar-red/40` with
`focus:border-amstar-red`. Red therefore serves double duty as alarm and focus -
acceptable because focus is transient and always paired with a caret or an open panel.

## Out of Scope

- Backend, API shape, `priorityScore` formula, auth.
- The client-side-only admin check and the hardcoded `http://localhost:8080` base
  URL, both noted in `CLAUDE.md`, real issues, but unrelated to this work.
- Layout and information architecture. Pages keep their current structure; only
  their skin changes.
- A light/dark toggle. The app becomes dark, full stop.

## Verification

There are no frontend tests, so `npm run build` (which runs `tsc -b` first) is the
type gate, and the rest is manual.

1. `npm run build` passes.
2. `npm run lint` (oxlint) passes.
3. `grep -rn 'bg-white\|text-slate-800\|border-slate-300\|slate-50\|slate-100' --include='*.tsx' frontend/src`
   returns only intentional survivors. This is the sweep that catches missed spots.
4. Every page visited while logged in as an admin: Shop Overview, Active Queue,
   Pricing Calculator, Completed History, Login, Register.
5. **Each of the nine floating panels opened and confirmed dark.** This is the
   single most likely thing to be missed and gets its own explicit pass.
6. Both modals opened (deep dive, delete confirm) and a toast triggered.
7. Severity segments checked for click, keyboard arrows, and auto-fill from a
   known service name.

## Implementation Order

Deliberately not a mass conversion, establish the tokens, prove them on one
page, then fan out.

1. Tokens in `tailwind.config.js`; fonts and `body` in `index.css` and `main.tsx`.
2. `src/styles/controls.ts` with all constants and helpers.
3. `Navbar.tsx` + `Dashboard.tsx`, verify the ramp end-to-end before going wider.
4. `ActiveQueue.tsx`, `History.tsx`, tables and their six floating panels.
5. `RepairForm.tsx`, inputs, three remaining panels, segmented severity.
6. `Login.tsx`, `Register.tsx`, `Pricing.tsx`.
7. `App.tsx` modals and toast.
8. `CLAUDE.md` conventions update.
9. Full verification sweep.
