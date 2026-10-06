import React from "react";
import type { VehicleRepair } from "../../types/repair";
import { getSeverityColor } from "../../styles/controls";
import { capacityRows } from "../../lib/shopStats";
import { Empty, Panel } from "./Panel";

/**
 * Who is carrying what. Replaces the old technician leaderboard: ranking by
 * completed count rewards taking easy work, and the question the counter
 * actually asks twenty times a day is "who takes the next car".
 */
export const CapacityPanel: React.FC<{
  repairs: VehicleRepair[];
  technicianNames: string[];
  today: string;
  onOpenTech: (name: string) => void;
  onOpenUnassigned: () => void;
}> = ({ repairs, technicianNames, today, onOpenTech, onOpenUnassigned }) => {
  const rows = capacityRows(repairs, technicianNames, today);
  const open = rows.reduce((sum, r) => sum + r.openCount, 0);

  if (rows.length === 0) {
    return (
      <Panel title="Who has capacity">
        <Empty>No technicians on the roster.</Empty>
      </Panel>
    );
  }

  return (
    <Panel title="Who has capacity" count={open}>
      <ul>
        {rows.map((row) => {
          const idle = row.openCount === 0;
          // A job sitting ten days is money parked in a bay. Flagging the age
          // points at the job, not at the person holding it.
          const stale = (row.oldestDays ?? 0) >= 7;
          return (
            <li key={row.name}>
              <button
                type="button"
                onClick={() =>
                  row.isUnassignedBucket
                    ? onOpenUnassigned()
                    : onOpenTech(row.name)
                }
                disabled={idle}
                className={`w-full min-h-9 flex items-center gap-2 px-1 text-left text-sm rounded-sm transition-colors enabled:hover:bg-amstar-raised disabled:cursor-default ${
                  row.isUnassignedBucket
                    ? "border-b border-amstar-line mb-1 pb-1.5"
                    : ""
                }`}
              >
                <span
                  className={`flex-1 min-w-0 truncate ${
                    row.isUnassignedBucket
                      ? "text-sev-4 font-bold"
                      : idle
                        ? "text-amstar-ink-faint"
                        : "text-amstar-ink"
                  }`}
                >
                  {row.name}
                </span>

                <span className="flex gap-1 shrink-0" aria-hidden="true">
                  {row.severities.map((sev, i) => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-sm ${getSeverityColor(sev)}`}
                    />
                  ))}
                </span>

                <span
                  className={`w-10 shrink-0 text-right font-mono tabular-nums text-xs ${
                    row.isUnassignedBucket
                      ? "text-sev-4"
                      : idle
                        ? "text-amstar-ink-faint"
                        : "text-amstar-ink-dim"
                  }`}
                >
                  {idle ? "idle" : row.openCount}
                </span>

                <span
                  className={`w-9 shrink-0 text-right font-mono tabular-nums text-[11px] ${
                    stale ? "text-amstar-red-ink" : "text-amstar-ink-faint"
                  }`}
                >
                  {row.oldestDays === null ? "" : `${row.oldestDays}d`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
