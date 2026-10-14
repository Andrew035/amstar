import React, { useEffect, useRef, useState } from "react";
import { FLOATING_PANEL_STYLE, HOVER, PRESS } from "../styles/controls";
import { panelCoords } from "../lib/floating";

export interface RowAction {
  label: string;
  onSelect: () => void;
  // Renders in red-ink and sits below a divider. At most one per menu.
  destructive?: boolean;
}

const PANEL_HEIGHT = 220;

/**
 * The overflow menu on a list row.
 *
 * Exists because the roster had four or five equal-weight buttons per row -
 * thirty-eight controls on one screen - with `Remove` red-outlined on every
 * one of them. The destructive action was both the loudest thing on the page
 * and the easiest to hit with a thumb. Collapsing the row to one trigger puts
 * the names back in charge and makes removing someone take two deliberate taps.
 *
 * Opens on tap, never on hover: `hoverOnlyWhenSupported` is on and this runs on
 * iPads, where a hover-revealed menu simply never appears.
 *
 * Fixed positioning through `panelCoords`, like every other dropdown here,
 * rather than an absolute child. That is what flips the panel above the trigger
 * for the last row in a long list and keeps it inside the visual viewport when
 * the iPad keyboard is up. `panelCoords` also clamps `left`, so a panel wider
 * than its 40px trigger ends up flush with the right margin instead of off
 * screen.
 */
export const RowMenu: React.FC<{ label: string; actions: RowAction[] }> = ({
  label,
  actions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const open = () => {
    if (!trigger.current) return;
    setCoords(
      panelCoords(trigger.current.getBoundingClientRect(), PANEL_HEIGHT, 220),
    );
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={open}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Actions for ${label}`}
        className={`shrink-0 grid place-items-center w-10 min-h-10 rounded-sm border text-amstar-ink-faint ${HOVER} ${PRESS} focus:outline-none focus:border-amstar-red-edge focus:ring-2 focus:ring-amstar-red-edge/40 ${isOpen ? "border-amstar-line bg-amstar-raised text-amstar-ink" : "border-transparent hover:border-amstar-line hover:text-amstar-ink"}`}
      >
        <span className="text-base leading-none tracking-widest">···</span>
      </button>

      {isOpen && (
        <>
          <div
            className="anim-fade fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          />
          <div
            role="menu"
            className={`${FLOATING_PANEL_STYLE} py-1`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  action.onSelect();
                }}
                className={`w-full min-h-11 px-4 flex items-center text-left font-cond uppercase tracking-widest text-[11px] ${HOVER} ${PRESS} ${action.destructive ? "mt-1 border-t border-amstar-line-soft text-amstar-red-ink hover:bg-amstar-red hover:text-white" : "text-amstar-ink-dim hover:bg-amstar-surface hover:text-amstar-ink"}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};
