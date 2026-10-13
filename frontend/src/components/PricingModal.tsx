import React, { useState } from "react";

import type { LineItem, VehicleRepair } from "../types/repair";
import { PRIMARY_BUTTON_STYLE, PRESS } from "../styles/controls";
import { money, vehicleLabel } from "../lib/ticketFilters";
import { CurrencyInput } from "./CurrencyInput";
import { PartsEditor } from "./PartsEditor";
import { PlateChip } from "./PlateChip";

/**
 * Parts and their costs for one car, opened from its row in the queue.
 *
 * <p>Prices the whole job: the parts with a cost each, plus labor. Both roles
 * reach it, and it writes PATCH /line-items and PATCH /pricing. The Invoices
 * page is where the owner adds the notes and the parts pad on top.
 *
 * <p>anim-pop is safe here, unlike NewTicketModal: nothing inside this panel is
 * a position-fixed dropdown, so there is no containing-block trap.
 */
export const PricingModal: React.FC<{
  repair: VehicleRepair;
  onClose: () => void;
  onSave: (
    id: number,
    lineItems: LineItem[],
    laborPrice: number,
  ) => Promise<void>;
}> = ({ repair, onClose, onSave }) => {
  const [lines, setLines] = useState<LineItem[]>(repair.lineItems ?? []);
  const [laborPrice, setLaborPrice] = useState<number>(repair.laborPrice || 0);
  const [isSaving, setIsSaving] = useState(false);

  const partsTotal = lines.reduce(
    (sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 0),
    0,
  );
  const total = partsTotal + laborPrice;

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
      laborPrice,
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
            className={`min-h-11 shrink-0 px-2 text-2xl leading-none text-amstar-ink-faint hover:text-amstar-ink ${PRESS}`}
          >
            &times;
          </button>
        </div>

        <PartsEditor lines={lines} onChange={setLines} />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-amstar-line-soft pt-4">
          <div className="flex items-start gap-6">
            <div>
              <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">Parts</span>
              <span className="flex min-h-11 items-center font-mono text-sm tabular-nums text-amstar-ink">
                {money(partsTotal)}
              </span>
            </div>
            <div>
              <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">Labor</span>
              <CurrencyInput
                value={laborPrice}
                onChange={setLaborPrice}
                aria-label="Labor price"
                className="min-h-11"
              />
            </div>
            <div>
              <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">Total</span>
              <span
                className={`flex min-h-11 items-center font-mono text-2xl font-bold tracking-tight tabular-nums ${
                  total > 0 ? "text-sev-1" : "text-amstar-ink-faint"
                }`}
              >
                {money(total)}
              </span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${PRIMARY_BUTTON_STYLE} min-h-11 px-8 text-xs`}
          >
            {isSaving ? "Saving..." : "Save pricing"}
          </button>
        </div>
      </div>
    </div>
  );
};
