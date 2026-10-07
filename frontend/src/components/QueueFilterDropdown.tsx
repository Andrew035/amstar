import React, { useEffect, useRef, useState } from "react";
import { FLOATING_PANEL_STYLE, TABLE_DROPDOWN_STYLE } from "../styles/controls";
import { panelCoords } from "../lib/floating";

/** Everything parseTicketFilter understands, in the order a manager scans. */
const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All tickets" },
  { value: "comeback", label: "Comebacks" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due today" },
  { value: "due-soon", label: "Due by tomorrow" },
  { value: "unassigned", label: "Unassigned" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In progress" },
  { value: "critical", label: "Critical (level 4-5)" },
];

const PANEL_HEIGHT = 360;

export const QueueFilterDropdown: React.FC<{
  value: string;
  onChange: (next: string) => void;
}> = ({ value, onChange }) => {
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

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={open}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${TABLE_DROPDOWN_STYLE} min-h-11 flex items-center gap-2 shrink-0`}
      >
        <span className="truncate">{current.label}</span>
        <span className="text-[10px] text-amstar-ink-faint">▼</span>
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
            role="listbox"
            className={`${FLOATING_PANEL_STYLE} overflow-y-auto p-1`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {OPTIONS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full min-h-11 px-3 rounded-sm text-left text-xs font-bold uppercase transition-colors ${
                  option.value === value
                    ? "bg-amstar-surface text-amstar-ink"
                    : "text-amstar-ink-dim hover:bg-amstar-surface"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};
