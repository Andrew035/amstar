import React, { useEffect, useRef } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  getSeverityColor,
  getStatusStyle,
} from "../styles/controls";
import {
  isComeback,
  isOverdue,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";

/**
 * The left half of the queue: every active ticket, one tappable row each.
 *
 * Deliberately carries only what you scan by - who, what car, when it is due,
 * where it stands. Everything editable lives in the detail pane, so a row never
 * has to fit a control and no column can starve another.
 */
export const QueueList: React.FC<{
  repairs: VehicleRepair[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  className?: string;
}> = ({
  repairs,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  className = "",
}) => {
  const scroller = useRef<HTMLDivElement>(null);

  /*
   * Bring the selected row into view. The queue scrolls inside its own box, so
   * arriving from /queue?ticket=14 would otherwise fill the detail pane with a
   * car whose row is thirty rows below the fold, and the list would look like
   * nothing had happened.
   *
   * `block: "nearest"` is what makes this safe to run on every selection
   * change: a row already on screen is left exactly where it is, so clicking
   * down the list never yanks it around.
   */
  useEffect(() => {
    scroller.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div
      className={`bg-amstar-surface border border-amstar-line rounded flex flex-col min-h-0 overflow-hidden ${className}`}
    >
      <div className="shrink-0 p-3 border-b border-amstar-line">
        <label
          htmlFor="queue-search"
          className="block font-cond uppercase tracking-widest text-[11px] text-amstar-ink-dim mb-1"
        >
          Find a job
        </label>
        <input
          id="queue-search"
          type="search"
          placeholder="Customer, plate, service, month or year"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${SEARCH_INPUT_STYLE} sm:w-full`}
        />
      </div>

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto">
        {repairs.map((item, i) => {
          const selected = item.id === selectedId;
          const late = isOverdue(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id!)}
              aria-current={selected}
              /*
               * The rows come in one after another rather than all at once,
               * which is what makes a filtered list read as having been rebuilt
               * instead of having blinked. Capped at ten so a 200-ticket queue
               * is not still animating six seconds after it loaded.
               */
              style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
              className={`anim-row w-full text-left flex items-center gap-3 min-h-16 px-3 py-2
              border-b border-amstar-line-soft border-l-[3px]
              transition-[background-color,border-color] duration-150 ease-out ${
                selected
                  ? "bg-amstar-raised border-l-amstar-red-edge"
                  : "border-l-transparent hover:bg-amstar-raised/50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`shrink-0 w-2 h-2 rounded-full ${getSeverityColor(item.severity)}`}
              ></span>

              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-bold text-amstar-ink">
                  {item.customerName}
                </span>
                <span className="block truncate text-[11px] text-amstar-ink-dim">
                  {vehicleLabel(item)}
                </span>
                {isComeback(item) && (
                  <span className="inline-block mt-0.5 px-1.5 rounded-sm bg-amstar-red text-white font-cond text-[9px] font-bold uppercase tracking-wider">
                    Comeback
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right">
                <span
                  className={`block font-mono tabular-nums text-[11px] ${late ? "text-amstar-red-ink" : "text-amstar-ink"}`}
                >
                  {usDate(item.expectedCompletionDate)}
                </span>
                <span
                  className={`inline-block mt-0.5 px-1.5 rounded-sm font-cond uppercase tracking-wider
                  text-[9px] border ${getStatusStyle(item.status)}`}
                >
                  {item.status?.replace("_", " ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
