import React, { useState } from "react";

import type { LineItem, VehicleRepair } from "../types/repair";
import { PRIMARY_BUTTON_STYLE } from "../styles/controls";
import { money, vehicleLabel } from "../lib/ticketFilters";
import { PartsEditor } from "./PartsEditor";
import { PlateChip } from "./PlateChip";

/**
 * Parts and their costs for one car, opened from its row in the queue.
 *
 * <p>Deliberately has no labor field. Labor is the owner's and lives on
 * PATCH /pricing, which is ADMIN-only. This modal writes PATCH /line-items and
 * nothing else, which is exactly the grant the bookkeeper has.
 *
 * <p>anim-pop is safe here, unlike NewTicketModal: nothing inside this panel is
 * a position-fixed dropdown, so there is no containing-block trap.
 */
export const PricingModal: React.FC<{
  repair: VehicleRepair;
  onClose: () => void;
  onSave: (id: number, lineItems: LineItem[]) => Promise<void>;
}> = ({ repair, onClose, onSave }) => {
  const [lines, setLines] = useState<LineItem[]>(repair.lineItems ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const partsTotal = lines.reduce(
    (sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 0),
    0,
  );

  const handleSave = async () => {
    setIsSaving(true);
    // A blank row is someone who tabbed too far, not a part. Quantity 0 is the
    // transient "being typed" state; settle both before sending or the backend
    // rejects the save.
    await onSave(
      repair.id!,
      lines
        .filter((l) => l.description.trim())
        .map((l) => ({ ...l, quantity: l.quantity || 1 })),
    );
    setIsSaving(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="anim-fade fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-start gap-4 border-b border-amstar-line pb-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink">
              Parts &amp; Pricing
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <PlateChip vehicle={repair.vehicle} />
              <span className="truncate font-cond text-sm font-bold uppercase tracking-wide text-amstar-ink-dim">
                {vehicleLabel(repair)}
              </span>
              <span className="truncate text-sm text-amstar-ink-faint">
                {repair.customerName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-11 shrink-0 px-2 text-2xl leading-none text-amstar-ink-faint hover:text-amstar-ink"
          >
            &times;
          </button>
        </div>

        <PartsEditor lines={lines} onChange={setLines} />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-amstar-line-soft pt-4">
          <div>
            <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">
              Parts total
            </span>
            <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-amstar-ink">
              {money(partsTotal)}
            </span>
            <span className="mt-1 block text-[11px] text-amstar-ink-faint">
              Labor is added on the invoice.
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${PRIMARY_BUTTON_STYLE} min-h-11 px-8 text-xs`}
          >
            {isSaving ? "Saving..." : "Save parts"}
          </button>
        </div>
      </div>
    </div>
  );
};
