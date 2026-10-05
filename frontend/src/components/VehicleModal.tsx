import React from "react";

import type { VehicleRepair } from "../types/repair";
import { TicketNotes } from "./TicketNotes";
import { SEVERITY_LABELS } from "../styles/controls";
import { vehicleLabel } from "../lib/ticketFilters";
import { PlateChip } from "./PlateChip";

/**
 * The vehicle snapshot: photo, who owns it, and the notes and parts pads.
 * Lifted out of App.tsx, where 123 lines of modal markup sat between the
 * mutation handlers and the routes.
 */
export const VehicleModal: React.FC<{
  repair: VehicleRepair;
  isAdmin: boolean;
  onClose: () => void;
  onSaveNotes: (id: number, notes: string) => Promise<void>;
  onSaveParts: (id: number, parts: string) => Promise<void>;
}> = ({ repair, isAdmin, onClose, onSaveNotes, onSaveParts }) => (
  <div
    onClick={() => onClose()}
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
    >
      <div className="flex justify-between items-center border-b border-amstar-line pb-3 mb-4">
        <h3 className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink">
          Vehicle Snapshot
        </h3>
        <button
          onClick={() => onClose()}
          className="text-amstar-ink-faint hover:text-amstar-ink text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      {repair.vehicle?.carImageUrl ? (
        <img
          src={repair.vehicle.carImageUrl}
          alt="Vehicle"
          className="w-full h-64 object-cover rounded mb-4 border border-amstar-line"
        />
      ) : (
        <div className="w-full h-48 bg-amstar-field rounded flex items-center justify-center text-amstar-ink-faint font-cond uppercase tracking-widest text-sm mb-4">
          No Photo Available
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            Customer
          </span>
          <span className="font-bold text-amstar-ink">
            {repair.customerName}
          </span>
        </div>
        <div>
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            Vehicle
          </span>
          <span className="font-bold text-amstar-ink">
            {vehicleLabel(repair)}
            {repair.vehicle?.model}
          </span>
        </div>
        <div>
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            VIN
          </span>
          <span className="font-mono tabular-nums text-xs bg-amstar-field px-2 py-1 rounded text-amstar-ink">
            {repair.vehicle?.vin || "N/A"}
          </span>
        </div>
        <div>
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            Plate
          </span>
          <div className="inline-block border border-amstar-line bg-amstar-field px-3 py-1 rounded font-mono tabular-nums text-center font-bold">
            <PlateChip vehicle={repair.vehicle} />
          </div>
        </div>
      </div>

      {/* Notes and parts: the same pad twice, side by side on a wide screen. */}
      <div className="mt-4 border-t border-amstar-line pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TicketNotes
          repairId={repair.id!}
          initialNotes={repair.notes}
          isAdmin={isAdmin}
          onSave={onSaveNotes}
          className=""
        />
        <TicketNotes
          repairId={repair.id!}
          initialNotes={repair.parts}
          isAdmin={isAdmin}
          onSave={onSaveParts}
          label="Parts"
          saveLabel="Save Parts"
          placeholder="Part names, numbers and what they were quoted at..."
          emptyText="No parts written down for this repair yet."
          className=""
        />
      </div>

      <div className="bg-amstar-surface p-4 rounded border border-amstar-line flex justify-between items-center">
        <div>
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            Job & Severity
          </span>
          <span className="font-bold text-amstar-red-ink text-base">
            {repair.serviceType}
          </span>
          <span className="block mt-1 text-xs font-bold text-amstar-ink-dim">
            {SEVERITY_LABELS[repair.severity]} Priority
          </span>
        </div>
        <div className="text-right">
          <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
            Assigned Tech(s)
          </span>
          <span className="font-bold text-amstar-ink text-sm block">
            {repair.assignedWorker || "Unassigned"}
          </span>
          <span className="inline-block mt-1 text-xs font-bold bg-amstar-blue text-white px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider border border-amstar-line">
            {repair.status}
          </span>
        </div>
      </div>
    </div>
  </div>
);
