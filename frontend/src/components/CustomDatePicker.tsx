import React, { useState } from "react";

import { SHARED_INPUT_STYLE, FLOATING_PANEL_STYLE } from "../styles/controls";
import { panelCoords } from "../lib/floating";

/**
 * Hand-rolled date picker. Native <input type="date"> was deliberately dropped:
 * its popup cannot be styled and it renders differently on every platform.
 *
 * Lives here rather than inside RepairForm because the queue edits due dates
 * with the same control, in a table cell - hence the className and dateFormat
 * props, which are the only differences between the two call sites.
 */
export const CustomDatePicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
  /** Trigger styling. The table cells pass a compact style instead. */
  className?: string;
  placeholder?: string;
  /** Renders the hidden input that keeps HTML5 form validation working. */
  required?: boolean;
  disabled?: boolean;
  /** "us" shows 09/30/2026, "iso" keeps the 2026-09-30 the tables use. */
  dateFormat?: "us" | "iso";
}> = ({
  value,
  onChange,
  className = SHARED_INPUT_STYLE,
  placeholder = "Select Date...",
  required = false,
  disabled = false,
  dateFormat = "us",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, maxHeight: 0 });
  const [currentView, setCurrentView] = useState(new Date());

  const handleOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { top, left, maxHeight } = panelCoords(rect, 320, 256);
    setCoords({ top, left, maxHeight });
    if (value) {
      const [y, m] = value.split("-");
      setCurrentView(new Date(parseInt(y), parseInt(m) - 1, 1));
    } else {
      setCurrentView(new Date());
    }
    setIsOpen(true);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(
      new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(
      new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1),
    );
  };

  const handleSelectDate = (day: number) => {
    const year = currentView.getFullYear();
    const month = String(currentView.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(
    currentView.getFullYear(),
    currentView.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(
    currentView.getFullYear(),
    currentView.getMonth(),
    1,
  ).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let displayValue = "";
  if (value) {
    const [y, m, d] = value.split("-");
    displayValue = dateFormat === "iso" ? value : `${m}/${d}${y}`;
  }

  return (
    <div className="relative w-full">
      {/* Hidden input to maintain HTML5 'required' validation */}
      {required && (
        <input
          type="text"
          readOnly
          required
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute opacity-0 w-0 h-0 -z-10"
        />
      )}

      <div
        onClick={handleOpen}
        className={`${className} flex justify-between items-center ${disabled ? "cursor-default opacity-70" : "cursor-pointer"} ${!value ? "text-amstar-ink-faint" : "text-amstar-ink font-bold"}`}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <svg
          className="w-4 h-4 text-amstar-ink-faint shrink-0 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          ></path>
        </svg>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={`${FLOATING_PANEL_STYLE} p-4 w-64 select-none overflow-y-auto`}
            style={{
              top: coords.top,
              left: coords.left,
              maxHeight: coords.maxHeight,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6 h-6 flex items-center justify-center hover:bg-amstar-surface rounded text-amstar-ink-dim font-black transition-colors"
              >
                {"<"}
              </button>
              <span className="text-sm font-black text-amstar-ink">
                {monthNames[currentView.getMonth()]} {currentView.getFullYear()}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6 h-6 flex items-center justify-center hover:bg-amstar-surface rounded text-amstar-ink-dim font-black transition-colors"
              >
                {">"}
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-black text-amstar-ink-faint uppercase"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {blanksArray.map((b) => (
                <div key={`blank-${b}`} className="w-7 h-7"></div>
              ))}
              {daysArray.map((day) => {
                const isSelected =
                  value ===
                  `${currentView.getFullYear()}-${String(currentView.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const today = new Date();
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === currentView.getMonth() &&
                  today.getFullYear() === currentView.getFullYear();

                return (
                  <div
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-colors
                      ${isSelected ? "bg-amstar-blue text-white shadow-md" : isToday ? "text-amstar-ink bg-amstar-raised border border-amstar-red/50" : "text-amstar-ink hover:bg-amstar-surface"}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
