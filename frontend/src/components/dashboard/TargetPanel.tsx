import React from "react";
import type { VehicleRepair } from "../../types/repair";
import { targetRows } from "../../lib/shopStats";
import { Panel } from "./Panel";

/**
 * Efficiency measures against the number each should be. A bare percentage is
 * not actionable; 29% unassigned against a "<10%" target is.
 */
export const TargetPanel: React.FC<{
  repairs: VehicleRepair[];
  today: string;
  onOpenFilter: (filter: string) => void;
}> = ({ repairs, today, onOpenFilter }) => (
  <Panel title="Against target">
    <ul>
      {targetRows(repairs, today).map((row) => (
        <li key={row.label}>
          <button
            type="button"
            onClick={() => row.filter && onOpenFilter(row.filter)}
            disabled={!row.filter}
            className="w-full min-h-9 flex items-center gap-2.5 px-1 text-left rounded-sm transition-colors enabled:hover:bg-amstar-raised disabled:cursor-default"
          >
            <span className="w-20 shrink-0 text-xs text-amstar-ink-dim truncate">
              {row.label}
            </span>
            <span className="flex-1 h-1.5 rounded-sm bg-amstar-field overflow-hidden">
              <span
                className={`block h-full rounded-sm ${row.meeting ? "bg-sev-1" : "bg-sev-4"}`}
                style={{ width: `${Math.min(100, row.pct)}%` }}
              />
            </span>
            <span
              className={`w-10 shrink-0 text-right font-mono tabular-nums text-xs font-bold ${
                row.meeting ? "text-sev-1" : "text-amstar-red-ink"
              }`}
            >
              {Math.round(row.pct)}%
            </span>
            <span className="w-10 shrink-0 text-right font-mono text-[10px] text-amstar-ink-faint">
              {row.target}
            </span>
          </button>
        </li>
      ))}
    </ul>
  </Panel>
);
