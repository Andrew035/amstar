import React, { useState } from "react";

import {
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  PRESS,
  getStatusStyle,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";
import { DropdownArrow } from "./DropdownArrow";

/**
 * The ticket's status, as a dropdown. Identical on the queue and on history.
 */
export const StatusDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  /** Sizing from the call site, the same escape hatch CustomDatePicker takes. */
  className?: string;
}> = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  /*
   * COMPLETED is deliberately not offered. Marking a repair invoiced is what
   * completes it and moves it into History, so there is one way in and the
   * shop cannot put a car there by picking a status - which is how "completed"
   * came to mean two different things in the first place.
   *
   * PATCH /status still accepts it, so a correction remains possible over the
   * API, and TicketLifecycleTest relies on that. On a History row, where the
   * value already is COMPLETED, the trigger falls back to showing the raw
   * status and these three become the reopen path.
   *
   * TO INVOICE is short because the status column is w-40 and "READY FOR
   * INVOICE" truncates there; the stored value is READY_FOR_INVOICE everywhere.
   */
  const options = [
    { val: "PENDING", label: "PENDING" },
    { val: "IN_PROGRESS", label: "IN PROGRESS" },
    { val: "READY_FOR_INVOICE", label: "TO INVOICE" },
  ];

  const currentLabel =
    options.find((o) => o.val === value)?.label || value?.replace(/_/g, " ");

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords(panelCoords(rect, options.length * 38, 130));
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={openDropdown}
        className={`w-full px-3 py-1.5 rounded-sm text-xs font-bold cursor-pointer transition-all flex justify-between items-center gap-1 border ${PRESS} ${getStatusStyle(value)} ${className}`}
      >
        <span className="truncate flex-1 min-w-0 text-center">
          {currentLabel}
        </span>
        <DropdownArrow isOpen={isOpen} className="!text-current opacity-70" />
      </div>
      {isOpen && (
        <>
          <div
            className="anim-fade fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={FLOATING_PANEL_STYLE}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((opt) => (
              <div
                key={opt.val}
                onClick={() => handleSelect(opt.val)}
                className={`${PANEL_ROW_STYLE} text-center`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
