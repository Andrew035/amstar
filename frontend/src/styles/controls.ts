// Single source of truth for control styling in the Shop Floor / Steel theme.
// These are exported strings rather than components on purpose: it preserves the
// existing convention of interpolating style constants into `className`, so call
// sites keep their current shape. See CLAUDE.md, "Shared style strings".

const FOCUS =
  "focus:outline-none focus:border-amstar-red focus:ring-2 focus:ring-amstar-red/40";

/**
 * How long anything under the pointer takes to answer it. 150ms is the longest
 * a hover can take before the control feels like it is lagging behind the
 * cursor, and the shortest that still reads as a transition rather than a jump.
 *
 * Named properties rather than `transition-all`: `all` animates layout
 * properties too, which is how a hover ends up repainting a whole table.
 */
export const HOVER = "transition-colors duration-150 ease-out";

/**
 * A surface that answers the pointer by lifting: stat tiles, panel headings,
 * cards. One pixel, which the eye reads and the layout does not. The press
 * state puts it back down, so a tap feels like pressing a physical key.
 *
 * Pair it with whatever colour change the call site wants. On an iPad none of
 * it fires, because `hoverOnlyWhenSupported` in tailwind.config.js gates every
 * hover variant behind a real pointer.
 */
export const HOVER_LIFT =
  "transition-[transform,background-color,border-color,color] duration-150 ease-out hover:-translate-y-px active:translate-y-0";

/** The push a button gives back when it is pressed. */
export const PRESS = "active:translate-y-px";

/**
 * Chips that brighten under the pointer: status and severity. Tailwind's bare
 * `transition` is the one that covers `filter`, which is what `brightness`
 * sets. `transition-colors` would leave the brightening to snap.
 */
export const CHIP_HOVER =
  "transition duration-150 ease-out hover:brightness-110";

export const SHARED_INPUT_STYLE = `w-full px-4 py-2.5 bg-amstar-field border border-amstar-line rounded text-sm font-medium text-amstar-ink shadow-inner transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-amstar-ink-faint ${FOCUS}`;

export const SEARCH_INPUT_STYLE = `w-full sm:w-80 px-4 py-2.5 bg-amstar-field border border-amstar-line rounded text-sm font-medium text-amstar-ink shadow-inner transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-amstar-ink-faint ${FOCUS}`;

export const NUMBER_INPUT_STYLE = `w-20 px-2 py-1.5 bg-amstar-field border border-amstar-line rounded font-mono text-sm font-bold text-amstar-ink tabular-nums shadow-inner transition-[border-color,box-shadow] duration-150 ease-out text-right ${FOCUS} disabled:opacity-40 disabled:bg-amstar-surface disabled:cursor-not-allowed`;

export const TABLE_DROPDOWN_STYLE = `px-3 py-1.5 bg-amstar-field border border-amstar-line rounded text-xs font-bold text-amstar-ink shadow-inner cursor-pointer ${HOVER} hover:border-amstar-red ${FOCUS}`;

/**
 * A control that opens a panel instead of accepting typing: the service,
 * technician, state and date pickers. The same box as SHARED_INPUT_STYLE plus
 * the hover the table dropdowns already had - anything clickable should react
 * to the pointer, or it reads as a disabled field.
 */
export const SELECT_TRIGGER_STYLE = `${SHARED_INPUT_STYLE} cursor-pointer hover:border-amstar-red`;

/** One row inside a dropdown panel. Sized for a fingertip on an iPad. */
export const OPTION_ROW_STYLE = `w-full min-h-10 flex items-center gap-3 px-3 py-2 rounded-sm text-left ${HOVER}`;

/**
 * The red action button: submit, save, done. Call sites add their own padding
 * and text size; everything else lives here so the ten copies of this button
 * cannot drift apart again.
 */
export const PRIMARY_BUTTON_STYLE = `bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-[background-color,transform] duration-150 ease-out ${PRESS} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amstar-red disabled:active:translate-y-0`;

export const INLINE_INPUT_STYLE = `px-3 py-1.5 bg-transparent border border-transparent hover:border-amstar-line focus:bg-amstar-field rounded text-xs font-bold text-amstar-ink ${HOVER} cursor-pointer uppercase w-full ${FOCUS}`;

// Static surfaces.
export const PANEL_STYLE =
  "bg-amstar-surface border border-amstar-line rounded";

export const PANEL_HEADING_STYLE =
  "font-cond uppercase tracking-widest text-amstar-ink-dim";

export const LABEL_STYLE =
  "block font-cond uppercase tracking-widest text-[11px] text-amstar-ink-dim mb-1";

// Floating panels rendered at fixed coordinates by the hand-rolled dropdowns.
// Callers still supply `style={{ top, left, width }}` from getBoundingClientRect().
// `anim-pop` (index.css) grows the panel from its top edge, which is where the
// trigger is, so the panel reads as having come out of the control you clicked.
export const FLOATING_PANEL_STYLE =
  "fixed bg-amstar-raised border border-amstar-line shadow-2xl rounded z-[101] overflow-hidden anim-pop";

export const PANEL_ROW_STYLE = `px-4 py-2.5 text-sm font-bold text-amstar-ink hover:bg-amstar-surface cursor-pointer border-b border-amstar-line-soft last:border-0 ${HOVER}`;

// Severity ramp. Level 2 moved from blue to cyan because blue-500 is invisible
// against the navy ground. Keys map to COMPLETE literal class strings: Tailwind
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

// One name per level, shared by the intake form and the queue's severity dropdown.
export const SEVERITY_LABELS: Record<number, string> = {
  1: "Minor",
  2: "Low",
  3: "Moderate",
  4: "Major",
  5: "Critical",
};

// All five sev-* values are bright, so severity chips take dark text, matching
// getStatusStyle's treatment of status chips. text-black (not amstar-ground) is
// required: amstar-ground against sev-5 #ff3b41 is only 4.42:1, under WCAG AA.
// Never pair text-white with bg-sev-*.
export const SEVERITY_TEXT = "text-black";

// Ticket status chips. This helper was previously duplicated byte-for-byte in
// ActiveQueue.tsx and History.tsx. Its IN_PROGRESS branch used `bg-blue-500`,
// which has the same invisible-on-navy problem as severity level 2, so the whole
// ramp moves onto the sev tokens. Bright chips take dark text.
export const getStatusStyle = (status?: string): string => {
  switch (status) {
    case "PENDING":
      return `bg-sev-3 text-black border-sev-3 ${CHIP_HOVER}`;
    case "IN_PROGRESS":
      return `bg-sev-2 text-black border-sev-2 ${CHIP_HOVER}`;
    default:
      return `bg-sev-1 text-black border-sev-1 ${CHIP_HOVER}`;
  }
};
