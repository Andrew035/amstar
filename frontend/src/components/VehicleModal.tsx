import React from "react";

import type { VehicleRepair } from "../types/repair";
import { TicketNotes } from "./TicketNotes";
import {
  PRESS,
  SEVERITY_LABELS,
  SEVERITY_TEXT,
  getSeverityColor,
  getStatusStyle,
} from "../styles/controls";
import {
  miles,
  phone,
  technicianList,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";
import { PlateChip } from "./PlateChip";
import { Fact } from "./Fact";

/**
 * Everything on file about one car and the job it is in for.
 *
 * <p>Uses the shared `Fact`, so a label here looks like a label on the Invoices
 * page and in History. It previously hand-rolled that markup six times with its
 * own spelling of the label class.
 */
export const VehicleModal: React.FC<{
  repair: VehicleRepair;
  canEdit: boolean;
  onClose: () => void;
  onSaveNotes: (id: number, notes: string) => Promise<void>;
  onSaveParts: (id: number, parts: string) => Promise<void>;
}> = ({
  repair,
  canEdit,
  onClose,
  onSaveNotes,
  onSaveParts,
}) => {
  const technicians = technicianList(repair);

  return (
    <div
      onClick={() => onClose()}
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded border border-amstar-line bg-amstar-raised p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-amstar-line pb-3">
          <div className="min-w-0">
            <h3 className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink">
              Vehicle Record
            </h3>
            <p className="mt-0.5 truncate text-sm font-medium text-amstar-ink-dim">
              {vehicleLabel(repair)} &middot; {repair.customerName}
            </p>
          </div>
          <button
            onClick={() => onClose()}
            aria-label="Close"
            className={`min-h-11 shrink-0 px-2 text-2xl leading-none text-amstar-ink-faint hover:text-amstar-ink ${PRESS}`}
          >
            &times;
          </button>
        </div>

        {/*
         * One height for both states. The photo used to be h-64 and the
         * placeholder h-48, so the modal changed size depending on whether a
         * Wikipedia lookup had found anything.
         */}
        {repair.vehicle?.carImageUrl ? (
          <img
            src={repair.vehicle.carImageUrl}
            alt=""
            className="mb-5 h-56 w-full rounded border border-amstar-line object-cover"
          />
        ) : (
          <div className="mb-5 grid h-56 w-full place-items-center rounded border border-dashed border-amstar-line bg-amstar-field font-cond text-sm uppercase tracking-widest text-amstar-ink-faint">
            No Photo Available
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Customer" value={repair.customerName} />
          <Fact label="Phone" value={phone(repair.customerPhone)} fallback="-" />
          {/*
           * vehicleLabel already joins year, make and model. This used to
           * render it and then append the model again, so a Honda Odyssey read
           * "2014 HONDA ODYSSEYODYSSEY".
           */}
          <Fact label="Vehicle" value={vehicleLabel(repair)} />
          <Fact label="VIN" value={repair.vehicle?.vin} mono />
          <Fact label="Plate">
            <PlateChip vehicle={repair.vehicle} />
          </Fact>
          <Fact
            label="Mileage"
            value={miles(repair.vehicle?.mileage)}
            fallback="-"
            mono
          />
          <Fact label="In" value={usDate(repair.entryDate)} mono />
          <Fact
            label="Repair done"
            value={usDate(repair.actualCompletionDate)}
            fallback="Not yet"
            mono
          />
          <Fact label="Service" value={repair.serviceType} />
          <Fact
            label="Technician(s)"
            value={technicians.join(", ")}
            fallback="Unassigned"
          />
          <Fact label="Severity">
            <span
              className={`inline-block rounded-sm px-2 py-1 font-cond text-[11px] uppercase tracking-widest ${getSeverityColor(
                repair.severity,
              )} ${SEVERITY_TEXT}`}
            >
              {SEVERITY_LABELS[repair.severity]}
            </span>
          </Fact>
          <Fact label="Status">
            {/* getStatusStyle, not a hand-picked blue, and /_/g so
                READY_FOR_INVOICE does not read "READY FOR_INVOICE". */}
            <span
              className={`inline-block rounded-sm border px-2 py-1 font-cond text-[11px] font-bold uppercase tracking-widest ${getStatusStyle(
                repair.status,
              )}`}
            >
              {repair.status?.replace(/_/g, " ")}
            </span>
          </Fact>
        </div>

        {/* Notes and parts: the same pad twice, side by side on a wide screen. */}
        <div className="grid grid-cols-1 gap-4 border-t border-amstar-line pt-5 sm:grid-cols-2">
          <TicketNotes
            repairId={repair.id!}
            initialNotes={repair.notes}
            canEdit={canEdit}
            onSave={onSaveNotes}
          />
          <TicketNotes
            repairId={repair.id!}
            initialNotes={repair.parts}
            canEdit={canEdit}
            onSave={onSaveParts}
            label="Parts"
            saveLabel="Save Parts"
            placeholder="Part names, numbers and what they were quoted at..."
            emptyText="No parts written down for this repair yet."
          />
        </div>
      </div>
    </div>
  );
};
