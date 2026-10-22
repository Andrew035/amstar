import React, { useEffect, useRef } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  SEVERITY_LABELS,
  SEVERITY_TEXT,
  getSeverityColor,
  PRESS,
} from "../styles/controls";
import {
  daysInShop,
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
        {/*
          No "Find a job" eyebrow: the placeholder below already says it is a
          search and what it searches. The sort order is the one thing the
          control cannot tell you itself, so that is all this line carries.
        */}
        <label
          htmlFor="queue-search"
          className="flex items-baseline justify-end font-cond tracking-normal text-[11px] text-amstar-ink-faint mb-1"
        >
          sorted by priority
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
        {repairs.map((item) => {
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
                No left strip. The filled row already says which ticket is
                selected and the row carries its own "12d late" chip, so the
                bar was a third way of saying something twice said.
              */
              className={`w-full text-left flex items-center gap-3 min-h-[4.5rem] px-3 py-2
              border-b border-amstar-line-soft
              transition-colors duration-150 ease-out ${
                selected ? "bg-amstar-raised" : "hover:bg-amstar-raised/50"
              } ${PRESS}`}
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

              {/*
                One kind of thing per line. This column used to hold a red
                "12d late" chip on some rows and a plain due date on others, so
                the same slot meant two different things and you had to read
                each one to know which. It is always the due date now, in red
                when it has passed - the exact day count is on the dashboard's
                "Needs attention" panel, which is where you go to triage.
              */}
              <span className="shrink-0 flex flex-col items-end gap-1 text-right">
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    late ? "font-bold text-amstar-red-ink" : "text-amstar-ink"
                  }`}
                >
                  {usDate(item.expectedCompletionDate)}
                </span>
                <span className="font-cond uppercase tracking-wider text-[9px] text-amstar-ink-faint">
                  {item.status?.replace(/_/g, " ")}
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
