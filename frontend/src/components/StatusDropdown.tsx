import React, { useState } from "react";

import {
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  getStatusStyle,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";

/**
 * The ticket's status, as a dropdown. Identical on the queue and on history.
 */
export const StatusDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const options = [
    { val: "PENDING", label: "PENDING" },
    { val: "IN_PROGRESS", label: "IN PROGRESS" },
    { val: "COMPLETED", label: "COMPLETED" },
  ];

  const currentLabel =
    options.find((o) => o.val === value)?.label || value?.replace("_", " ");

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords(panelCoords(rect, 3 * 38, 130));
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div
        onClick={openDropdown}
        className={`w-full px-3 py-1.5 rounded-sm text-xs font-bold cursor-pointer transition-all flex justify-between items-center border ${getStatusStyle(value)}`}
      >
        <span className="truncate flex-1 text-center">{currentLabel}</span>
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
