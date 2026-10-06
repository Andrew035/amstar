import React, { useEffect, useState } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  LABEL_STYLE,
  PANEL_STYLE,
  SHARED_INPUT_STYLE,
  TABLE_DROPDOWN_STYLE,
} from "../styles/controls";
import { isComeback, usDate, vehicleLabel } from "../lib/ticketFilters";
import { SeverityDropdown } from "./SeverityDropdown";
import { StatusDropdown } from "./StatusDropdown";
import { CustomDatePicker } from "./CustomDatePicker";
import { MultiWorkerDropdown } from "./WorkerDropdown";
import { ServicesCell } from "./ServicesCell";
import { TicketNotes } from "./TicketNotes";
import { PlateChip } from "./PlateChip";

/**
 * The customer name, corrected in place - it was usually typed wrong at intake.
 * Saving points this ticket at the corrected name; other tickets keep theirs,
 * so one fix never rewrites another job's paperwork.
 */
const CustomerNameField: React.FC<{
  repairId: number;
  value: string;
  isAdmin: boolean;
  onSave: (id: number, name: string) => void;
}> = ({ repairId, value, isAdmin, onSave }) => {
  const [draft, setDraft] = useState(value);

  // The pane stays mounted while you move between tickets.
  useEffect(() => setDraft(value), [repairId, value]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    onSave(repairId, next);
  };

  if (!isAdmin) {
    return (
      <span className="block text-sm font-bold text-amstar-ink">{value}</span>
    );
  }

  return (
    <input
      type="text"
      value={draft}
      aria-label="Customer name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(value);
      }}
      className="w-full max-w-xs px-2 py-1 -ml-2 bg-transparent border border-transparent rounded-sm
      text-sm font-bold text-amstar-ink transition-colors cursor-pointer hover:border-amstar-line
      focus:bg-amstar-field focus:cursor-text focus:outline-none focus:border-amstar-red
      focus:ring-2 focus:ring-amstar-red/40"
    />
  );
};

/**
 * The right half of the queue: one ticket, everything about it, all editable.
 *
 * This is what used to be spread across ten table columns plus the vehicle
 * deep-dive modal. Nothing opens on top of anything here - notes, parts and the
 * photo are simply on screen, which is what the width was always for.
 */
export const TicketDetail: React.FC<{
  repair: VehicleRepair | null;
  isAdmin: boolean;
  technicianNames: string[];
  historicalServiceMap: Record<string, number>;
  onStatusChange: (id: number, status: string) => void;
  onSeverityChange: (id: number, severity: number) => void;
  onDueDateChange: (id: number, dueDate: string) => void;
  onCustomerNameChange: (id: number, name: string) => void;
  onAssignWorker: (id: number, workers: string) => void;
  onServiceChange: (id: number, service: string) => void;
  onSaveNotes: (id: number, notes: string) => Promise<void>;
  onSaveParts: (id: number, parts: string) => Promise<void>;
  onDeleteClick: (id: number) => void;
  onSaveComeback: (id: number, isComeback: boolean) => void;
  className?: string;
}> = ({
  repair,
  isAdmin,
  technicianNames,
  historicalServiceMap,
  onStatusChange,
  onSeverityChange,
  onDueDateChange,
  onCustomerNameChange,
  onAssignWorker,
  onServiceChange,
  onSaveNotes,
  onSaveParts,
  onDeleteClick,
  onSaveComeback,
  className = "",
}) => {
  if (!repair) {
    return (
      <div
        className={`${PANEL_STYLE} border-dashed grid place-items-center p-8 text-center text-amstar-ink-dim ${className}`}
      >
        Select a job from the list to see its ticket.
      </div>
    );
  }

  const id = repair.id!;

  return (
    <div
      className={`bg-amstar-surface border border-amstar-line rounded flex flex-col min-h-0 overflow-hidden ${className}`}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="shrink-0 flex items-start gap-5 pb-5 border-b border-amstar-line-soft">
          {repair.vehicle?.carImageUrl ? (
            <img
              src={repair.vehicle.carImageUrl}
              alt=""
              className="shrink-0 w-40 h-28 sm:w-48 sm:h-32 object-cover rounded border border-amstar-line"
            />
          ) : (
            <div className="shrink-0 w-40 h-28 sm:w-48 sm:h-32 grid place-items-center rounded border border-dashed border-amstar-line bg-amstar-field font-cond uppercase tracking-widest text-[10px] text-amstar-ink-faint">
              No Photo
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-cond text-2xl font-bold uppercase tracking-wide text-amstar-ink truncate">
              {vehicleLabel(repair)}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 my-1.5">
              <PlateChip vehicle={repair.vehicle} />
              {repair.vehicle?.vin && (
                <span className="font-mono text-[11px] text-amstar-ink-faint truncate">
                  VIN {repair.vehicle.vin}
                </span>
              )}
            </div>
            <CustomerNameField
              repairId={id}
              value={repair.customerName}
              isAdmin={isAdmin}
              onSave={onCustomerNameChange}
            />
            <div className="mt-2">
              {isAdmin ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isComeback(repair)}
                  onClick={() => onSaveComeback(id, !isComeback(repair))}
                  disabled={(repair.ticketCount ?? 1) > 1}
                  title={
                    (repair.ticketCount ?? 1) > 1
                      ? "This vehicle already has more than one ticket here"
                      : undefined
                  }
                  className={`min-h-8 px-2.5 rounded-sm border font-cond text-[10px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed ${
                    isComeback(repair)
                      ? "bg-amstar-red border-amstar-red text-white"
                      : "border-amstar-line text-amstar-ink-faint hover:border-amstar-red hover:text-amstar-ink"
                  }`}
                >
                  Comeback
                </button>
              ) : (
                isComeback(repair) && (
                  <span className="inline-block min-h-8 px-2.5 py-1 rounded-sm bg-amstar-red text-white font-cond text-[10px] font-bold uppercase tracking-wider">
                    Comeback
                  </span>
                )
              )}
            </div>
          </div>

          <div className="shrink-0 w-40">
            <span className={LABEL_STYLE}>Status</span>
            {isAdmin ? (
              <StatusDropdown
                value={repair.status || "PENDING"}
                onChange={(val) => onStatusChange(id, val)}
                className="min-h-11"
              />
            ) : (
              <span className="block text-sm font-bold text-amstar-ink">
                {repair.status?.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div>
            <span className={LABEL_STYLE}>Severity</span>
            {isAdmin ? (
              <SeverityDropdown
                value={repair.severity}
                onChange={(level) => onSeverityChange(id, level)}
                fullWidth
              />
            ) : (
              <span className="block text-sm font-bold text-amstar-ink">
                Level {repair.severity}
              </span>
            )}
          </div>

          <div>
            <span className={LABEL_STYLE}>Due Date</span>
            {isAdmin ? (
              <CustomDatePicker
                value={repair.expectedCompletionDate}
                onChange={(date) => onDueDateChange(id, date)}
                className={`${TABLE_DROPDOWN_STYLE} w-full min-h-11 font-mono tabular-nums`}
              />
            ) : (
              <span className="block font-mono text-sm text-amstar-ink">
                {usDate(repair.expectedCompletionDate)}
              </span>
            )}
          </div>

          <div className="sm:col-span-2 xl:col-span-1">
            <span className={LABEL_STYLE}>Technician(s)</span>
            {isAdmin ? (
              <MultiWorkerDropdown
                currentWorkers={repair.assignedWorker}
                technicianNames={technicianNames}
                onAssign={(workers) => onAssignWorker(id, workers)}
                className="min-h-11"
              />
            ) : (
              <span className="block text-sm font-bold text-amstar-ink">
                {repair.assignedWorker || "Unassigned"}
              </span>
            )}
          </div>
        </div>

        <div>
          <span className={LABEL_STYLE}>Service</span>
          <div className={`${SHARED_INPUT_STYLE} !p-0 overflow-visible`}>
            <ServicesCell
              value={repair.serviceType}
              historicalMap={historicalServiceMap}
              onChange={(next) => onServiceChange(id, next)}
              readOnly={!isAdmin}
              className="min-h-11"
              subtitle={`${vehicleLabel(repair)} - ${repair.customerName}`}
            />
          </div>
        </div>

        {/* Manager-only. The API also withholds these fields from a shop-floor
            account, so this hides a panel rather than being the boundary. */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
            <TicketNotes
              repairId={id}
              initialNotes={repair.notes}
              isAdmin={isAdmin}
              onSave={onSaveNotes}
              className="flex flex-col min-h-0"
              textareaClass="flex-1 min-h-32"
            />
            <TicketNotes
              repairId={id}
              initialNotes={repair.parts}
              isAdmin={isAdmin}
              onSave={onSaveParts}
              label="Parts"
              saveLabel="Save Parts"
              placeholder="Part name, part number, price - written down, not stored as figures..."
              emptyText="No parts recorded for this repair yet."
              className="flex flex-col min-h-0"
              textareaClass="flex-1 min-h-32"
            />
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3 p-4 border-t border-amstar-line">
        <div>
          <span className={LABEL_STYLE}>Entry date</span>
          <span className="block font-mono tabular-nums text-lg font-bold text-amstar-ink">
            {usDate(repair.entryDate)}
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDeleteClick(id)}
            className="ml-auto px-5 min-h-11 bg-transparent border border-amstar-red text-amstar-red-ink
            hover:bg-amstar-red hover:text-white rounded-sm font-cond uppercase tracking-widest text-xs
            transition-colors"
          >
            Delete Ticket
          </button>
        )}
      </div>
    </div>
  );
};
