import React, { useState } from "react";
import {
  FLOATING_PANEL_STYLE,
  OPTION_ROW_STYLE,
  SEVERITY_LABELS,
  SEVERITY_TEXT,
  CHIP_HOVER,
  getSeverityColor,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";

/**
 * Admin-only severity picker. Changing it reorders the queue, because severity
 * is the heaviest term in priorityScore.
 *
 * Lifted out of ActiveQueue when the queue became a split view: the ticket
 * detail pane needs the same control, just filling a labelled field instead of
 * sitting inside a table cell - hence `fullWidth`.
 */
export const SeverityDropdown: React.FC<{
  value: number;
  onChange: (val: number) => void;
  fullWidth?: boolean;
}> = ({ value, onChange, fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const openDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Five 40px rows plus the panel's padding.
    setCoords(panelCoords(rect, 5 * 40 + 8, 176));
    setIsOpen(true);
  };

  const handleSelect = (level: number) => {
    setIsOpen(false);
    if (level !== value) onChange(level);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center gap-1.5 rounded-sm font-cond uppercase
        tracking-wider whitespace-nowrap active:translate-y-px ${CHIP_HOVER}
        ${SEVERITY_TEXT} ${getSeverityColor(value)}
        ${fullWidth ? "w-full min-h-11 px-3 text-xs" : "px-2 py-0.5 text-[11px]"}`}
      >
        {SEVERITY_LABELS[value]}
        {/* Points down when shut, up when open: the control states which it is. */}
        <span
          className={`text-[8px] leading-none transition-transform duration-200 ease-out ${
            isOpen ? "-rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] anim-fade"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            role="listbox"
            aria-label="Severity"
            className={`${FLOATING_PANEL_STYLE} p-1`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={level === value}
                onClick={() => handleSelect(level)}
                className={`${OPTION_ROW_STYLE} ${level === value ? "bg-amstar-surface" : "hover:bg-amstar-surface"}`}
              >
                <span
                  className={`shrink-0 w-20 text-center px-1.5 py-0.5 rounded-sm font-cond
                  uppercase tracking-wider text-[11px] ${SEVERITY_TEXT} ${getSeverityColor(level)}`}
                >
                  {SEVERITY_LABELS[level]}
                </span>
                <span className="flex-1 text-xs font-bold text-amstar-ink-dim">
                  Level {level}
                </span>
                {level === value && (
                  <span className="text-xs font-black text-amstar-red-ink">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};
