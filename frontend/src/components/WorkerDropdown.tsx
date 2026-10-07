import React, { useState } from "react";

import {
  TABLE_DROPDOWN_STYLE,
  INLINE_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_HEADING_STYLE,
  OPTION_ROW_STYLE,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";
import { Truncated } from "./Truncated";

/**
 * Assigns technicians to one ticket. Used by the queue and by history, which
 * differ only in how the closed control looks - hence `variant`.
 */
export const MultiWorkerDropdown: React.FC<{
  currentWorkers: string | undefined;
  onAssign: (workers: string) => void;
  technicianNames: string[];
  /** "table" is the boxed control in the queue; "inline" is History's quieter
   *  cell, where the arrow only appears on hover. */
  variant?: "table" | "inline";
  /** Sizing from the call site, the same escape hatch CustomDatePicker takes. */
  className?: string;
}> = ({
  currentWorkers,
  onAssign,
  technicianNames,
  variant = "table",
  className = "",
}) => {
  const inline = variant === "inline";
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const selectedArray = currentWorkers
    ? currentWorkers
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w !== "")
    : [];

  // Anyone already on the ticket stays in the list even after they leave the
  // roster - otherwise there is no way to take their name back off it.
  const isOnRoster = (name: string) =>
    technicianNames.some((n) => n.toLowerCase() === name.toLowerCase());
  const workersList = [
    ...technicianNames,
    ...selectedArray.filter((w) => !isOnRoster(w)),
  ];

  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName)
      ? selectedArray.filter((w) => w !== workerName)
      : [...selectedArray, workerName];
    onAssign(updatedSelection.join(", "));
  };

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // 192 stays the floor so History's narrow inline trigger still opens a
    // usable panel; a full-width trigger now gets a panel to match.
    setCoords(panelCoords(rect, 226, 192));
    setIsOpen(true);
  };

  return (
    <>
      <div
        onClick={openDropdown}
        className={`${
          inline
            ? `${INLINE_INPUT_STYLE} group`
            : `${TABLE_DROPDOWN_STYLE} w-full`
        } flex justify-between items-center ${className}`}
      >
        <Truncated
          value={
            selectedArray.length === 0 ? "Unassigned" : selectedArray.join(", ")
          }
          className="flex-1"
          tapToReveal={false}
        />
        <span
          className={`text-[10px] ml-2 text-amstar-ink-faint shrink-0 ${
            inline ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""
          }`}
        >
          ▼
        </span>
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
            <div
              className={`${PANEL_HEADING_STYLE} bg-amstar-raised px-3 py-2 border-b border-amstar-line-soft text-[10px] font-black`}
            >
              Assign Technicians
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map((worker) => {
                const isOn = selectedArray.includes(worker);
                const former = !isOnRoster(worker);
                return (
                  <button
                    key={worker}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    onClick={() => handleToggle(worker)}
                    className={`${OPTION_ROW_STYLE} ${isOn ? "bg-amstar-surface" : "hover:bg-amstar-surface"}`}
                  >
                    <span
                      className={`shrink-0 w-4 h-4 rounded-sm border grid place-items-center text-[10px] font-black ${isOn ? "bg-amstar-red border-amstar-red text-white" : "border-amstar-line"}`}
                    >
                      {isOn ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-xs font-bold text-amstar-ink">
                      {worker}
                    </span>
                    {former && (
                      <span className="shrink-0 font-cond uppercase tracking-wider text-[9px] text-amstar-ink-faint">
                        Former
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};
