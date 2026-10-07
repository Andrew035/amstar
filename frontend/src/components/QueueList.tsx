import React, { useEffect, useRef } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  SEVERITY_LABELS,
  SEVERITY_TEXT,
  getSeverityColor,
} from "../styles/controls";
import {
  daysInShop,
  daysLate,
  isComeback,
  isOverdue,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";

/**
 * The left half of the queue: every active ticket, one tappable row each.
 *
 * A row answers the questions asked of a queue without opening anything: how
 * bad is it, who has it, how long has it been here, is it late. It used to
 * answer only the first, and only as an 8px dot whose colour had to be
 * memorised, while the dashboard's "Needs attention" panel already showed the
 * same severity as a numbered chip. The busier screen had the weaker
 * treatment; this brings the two in line.
 *
 * Status moved from a coloured chip to quiet text on purpose. Severity and
 * lateness are the two things worth spending colour on in a list this dense;
 * a third chip competed with both.
 *
 * Everything editable still lives in the detail pane, so a row never has to
 * fit a control and no column can starve another.
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

  /*
   * Arrow keys walk the list. This is a list someone works through all day on
   * a desktop, and reaching for the mouse once per ticket is the slow path.
   *
   * Ignored while a text field has focus, so find-as-you-type in the search
   * box still moves the caret rather than the selection.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return;
      }
      const i = repairs.findIndex((r) => r.id === selectedId);
      if (i === -1) return;
      const next = e.key === "ArrowDown" ? i + 1 : i - 1;
      if (next < 0 || next >= repairs.length) return;
      e.preventDefault();
      onSelect(repairs[next].id!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [repairs, selectedId, onSelect]);

  return (
    <div
      className={`bg-amstar-surface border border-amstar-line rounded flex flex-col min-h-0 overflow-hidden ${className}`}
    >
      <div className="shrink-0 p-3 border-b border-amstar-line">
        <label
          htmlFor="queue-search"
          className="flex items-baseline justify-between font-cond uppercase tracking-widest text-[11px] text-amstar-ink-dim mb-1"
        >
          <span>Find a job</span>
          {/* The list has always been ranked by priorityScore. Nothing said so. */}
          <span className="normal-case tracking-normal text-amstar-ink-faint">
            sorted by priority
          </span>
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
          const days = daysInShop(item);
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
              className={`anim-row w-full text-left flex items-center gap-3 min-h-[4.5rem] px-3 py-2
              border-b border-amstar-line-soft border-l-[3px]
              transition-[background-color,border-color] duration-150 ease-out ${
                selected
                  ? "bg-amstar-raised border-l-amstar-red-edge"
                  : late
                    ? "border-l-sev-5/70 hover:bg-amstar-raised/50"
                    : "border-l-transparent hover:bg-amstar-raised/50"
              }`}
            >
              {/* Severity, named. The digit is the level, the tooltip the word. */}
              <span
                className={`shrink-0 w-7 h-7 grid place-items-center rounded-sm font-cond text-xs font-bold
                ${SEVERITY_TEXT} ${getSeverityColor(item.severity)}`}
                title={`Severity ${item.severity}: ${SEVERITY_LABELS[item.severity]}`}
              >
                {item.severity}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-amstar-ink">
                    {item.customerName}
                  </span>
                  {isComeback(item) && (
                    <span className="shrink-0 px-1.5 rounded-sm bg-amstar-red text-white font-cond text-[9px] font-bold uppercase tracking-wider">
                      Comeback
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-amstar-ink-dim">
                  {vehicleLabel(item)}
                </span>
                {/* Who owns it, and how long it has been here, without a click. */}
                <span className="block truncate text-[11px] text-amstar-ink-faint">
                  {item.assignedWorker || (
                    <span className="font-bold text-amstar-red-ink">
                      Unassigned
                    </span>
                  )}
                  {days !== null && <span> · {days}d in shop</span>}
                </span>
              </span>

              <span className="shrink-0 flex flex-col items-end gap-1 text-right">
                {late ? (
                  <span className="px-1.5 rounded-sm bg-sev-5 text-black font-cond text-[10px] font-bold uppercase tracking-wider">
                    {daysLate(item)}d late
                  </span>
                ) : (
                  <span className="font-mono tabular-nums text-[11px] text-amstar-ink">
                    {usDate(item.expectedCompletionDate)}
                  </span>
                )}
                <span className="font-cond uppercase tracking-wider text-[9px] text-amstar-ink-faint">
                  {item.status?.replace("_", " ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-amstar-line px-3 py-1.5 text-[10px] text-amstar-ink-faint">
        Arrow keys move between jobs
      </div>
    </div>
  );
};
