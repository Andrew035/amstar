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
