import React, { useState } from "react";
import type { LineItem, VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  PANEL_STYLE,
  PRIMARY_BUTTON_STYLE,
  NUMBER_INPUT_STYLE,
  getStatusStyle,
} from "../styles/controls";
import { Truncated } from "../components/Truncated";
import { CurrencyInput } from "../components/CurrencyInput";
import { useSearchParams } from "react-router-dom";
import {
  invoiceTotal,
  isUnbilled,
  matchesSearch,
  parseTicketFilter,
  vehicleLabel,
} from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";
import { PlateChip } from "../components/PlateChip";

/** One labelled fact in the expanded editor. */
const Fact: React.FC<{
  label: string;
  value?: string | null;
  fallback?: string;
  mono?: boolean;
  /** Renders instead of `value`, for a fact that is a component rather than text. */
  children?: React.ReactNode;
}> = ({ label, value, fallback = "N/A", mono = false, children }) => (
  <div className="min-w-0">
    <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
      {label}
    </span>
    {children ?? (
      <Truncated
        value={value || fallback}
        className={`block px-2 py-1 bg-amstar-field border border-amstar-line rounded-sm text-[11px] font-bold text-amstar-ink ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      />
    )}
  </div>
);

/** What the Save button sends. Shared so the page and the row cannot drift. */
export type InvoicePayload = {
  lineItems: LineItem[];
  laborPrice: number;
};

export type SaveInvoice = (id: number, payload: InvoicePayload) => void;

const blankLine = (): LineItem => ({
  description: "",
  unitPrice: 0,
  quantity: 1,
  vendor: "",
});

const ROW_INPUT =
  "w-full min-h-11 px-3 bg-amstar-ground border border-amstar-line rounded-sm text-xs font-bold text-amstar-ink uppercase placeholder:text-amstar-ink-faint placeholder:normal-case transition-colors focus:border-amstar-red focus:outline-none";

const PARTS_GRID = "grid grid-cols-[1fr_3.5rem_8rem_7rem_2.5rem] gap-1.5";

/**
 * The parts editor for one ticket. Lives inside an expanded row, so it gets the
 * full page width and the parts table never has to squeeze.
 */
const InvoiceEditor: React.FC<{
  item: VehicleRepair;
  onSaveInvoice: SaveInvoice;
}> = ({ item, onSaveInvoice }) => {
  const [lines, setLines] = useState<LineItem[]>(item.lineItems ?? []);
  const [laborPrice, setLaborPrice] = useState<number>(item.laborPrice || 0);
  const [isSaving, setIsSaving] = useState(false);

  const partsTotal = lines.reduce(
    (sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 0),
    0,
  );
  const currentTotal = partsTotal + laborPrice;

  const patchLine = (index: number, patch: Partial<LineItem>) =>
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const removeLine = (index: number) =>
    setLines(lines.filter((_, i) => i !== index));

  const handleSave = async () => {
    setIsSaving(true);
    // A blank row is someone who tabbed too far, not a part. Quantity 0 is the
    // transient "being typed" state; settle both before sending or the backend
    // rejects the save.
    await onSaveInvoice(item.id!, {
      lineItems: lines
        .filter((l) => l.description.trim())
        .map((l) => ({ ...l, quantity: l.quantity || 1 })),
      laborPrice,
    });
    setTimeout(() => setIsSaving(false), 400);
  };

  return (
    <div className="border-t border-amstar-line-soft bg-amstar-field p-4 sm:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Fact label="VIN" value={item.vehicle?.vin} mono />
        <Fact label="Plate">
          <PlateChip vehicle={item.vehicle} />
        </Fact>
        <Fact label="Service" value={item.serviceType} />
        <Fact
          label="Technician(s)"
          value={item.assignedWorker}
          fallback="Unassigned"
        />
      </div>

      <span className="block font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-amstar-ink-dim">
        Parts
      </span>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {lines.length === 0 && (
          <p className="py-3 text-xs text-amstar-ink-faint">
            No parts yet. Add the first one below.
          </p>
        )}

        {lines.length > 0 && (
          <div className={`${PARTS_GRID} px-1 pb-1`}>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint">
              Part
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint text-center">
              Qty
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint text-right">
              Price
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint">
              Vendor
            </span>
            <span />
          </div>
        )}

        {lines.map((line, i) => (
          <div key={i} className={`${PARTS_GRID} items-center`}>
            <input
              value={line.description}
              onChange={(e) =>
                patchLine(i, { description: e.target.value.toUpperCase() })
              }
              placeholder="FRONT BRAKE PADS"
              maxLength={200}
              aria-label={`Part ${i + 1} name`}
              className={ROW_INPUT}
            />
            <input
              type="text"
              inputMode="numeric"
              // 0 is the "empty while typing" state so the field can actually be
              // cleared; onBlur settles it back to 1.
              value={line.quantity === 0 ? "" : line.quantity}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                patchLine(i, { quantity: digits ? parseInt(digits, 10) : 0 });
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                if (!line.quantity) patchLine(i, { quantity: 1 });
              }}
              aria-label={`Part ${i + 1} quantity`}
              className={`${NUMBER_INPUT_STYLE} w-full min-h-11 text-center`}
            />
            <CurrencyInput
              value={line.unitPrice}
              onChange={(unitPrice) => patchLine(i, { unitPrice })}
              aria-label={`Part ${i + 1} price`}
              className="w-full min-h-11"
            />
            <input
              value={line.vendor ?? ""}
              onChange={(e) =>
                patchLine(i, { vendor: e.target.value.toUpperCase() })
              }
              placeholder="PA"
              maxLength={60}
              aria-label={`Part ${i + 1} vendor`}
              className={ROW_INPUT}
            />
            <button
              type="button"
              onClick={() => removeLine(i)}
              aria-label={`Remove ${line.description || `part ${i + 1}`}`}
              className="min-h-11 w-full grid place-items-center rounded-sm text-amstar-ink-faint hover:text-white hover:bg-amstar-red transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setLines([...lines, blankLine()])}
          className="mt-1 min-h-11 px-3 rounded-sm border border-dashed border-amstar-line text-left font-cond text-[10px] font-bold uppercase tracking-widest text-amstar-ink-dim hover:border-amstar-red hover:text-amstar-ink transition-colors"
        >
          + Add part
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-amstar-line-soft flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-6">
          <div>
            <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
              Parts
            </span>
            <span className="font-mono tabular-nums text-sm text-amstar-ink">
              ${partsTotal.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
              Labor
            </span>
            <CurrencyInput
              value={laborPrice}
              onChange={setLaborPrice}
              aria-label="Labor price"
              className="min-h-11"
            />
          </div>
          <div>
            <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
              Total
            </span>
            <span
              className={`font-mono tabular-nums text-2xl font-bold tracking-tight ${
                currentTotal > 0 ? "text-sev-1" : "text-amstar-ink-faint"
              }`}
            >
              ${currentTotal.toFixed(2)}
            </span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`${PRIMARY_BUTTON_STYLE} min-h-11 px-8 text-xs`}
        >
          {isSaving ? "Saving..." : "Save Pricing"}
        </button>
      </div>
    </div>
  );
};

/** One ticket: a scannable summary line that opens its editor in place. */
const PricingRow: React.FC<{
  item: VehicleRepair;
  isOpen: boolean;
  onToggle: () => void;
  onSaveInvoice: SaveInvoice;
}> = ({ item, isOpen, onToggle, onSaveInvoice }) => {
  const total = invoiceTotal(item);
  const needsPricing = isUnbilled(item);

  return (
    <div className={`${PANEL_STYLE} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-3 sm:px-4 min-h-12 text-left hover:bg-amstar-surface transition-colors"
      >
        <PlateChip
          vehicle={item.vehicle}
          className="w-[6.5rem] shrink-0 truncate"
        />
        <span className="flex-1 min-w-0 truncate font-cond text-sm font-bold uppercase tracking-wide text-amstar-ink">
          {vehicleLabel(item)}
        </span>
        <span className="hidden md:block w-32 shrink-0 truncate text-xs text-amstar-ink-dim">
          {item.customerName}
        </span>
        <span
          className={`hidden sm:block shrink-0 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase ${getStatusStyle(item.status)}`}
        >
          {item.status.replace("_", " ")}
        </span>
        <span
          className={`w-24 shrink-0 text-right font-mono tabular-nums text-sm font-bold ${
            needsPricing ? "text-amstar-red-ink" : "text-amstar-ink"
          }`}
        >
          ${total.toFixed(2)}
        </span>
        <span
          aria-hidden="true"
          className={`w-4 shrink-0 text-center text-xs text-amstar-ink-faint transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>

      {isOpen && <InvoiceEditor item={item} onSaveInvoice={onSaveInvoice} />}
    </div>
  );
};

export const PricingPage: React.FC<{
  repairs: VehicleRepair[];
  onSaveInvoice: SaveInvoice;
}> = ({ repairs, onSaveInvoice }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketFilter = parseTicketFilter(searchParams.get("filter"));

  const sortNewestFirst = (a: VehicleRepair, b: VehicleRepair) =>
    (b.id || 0) - (a.id || 0);

  const visible = repairs
    .filter((r) => !ticketFilter || ticketFilter.matches(r))
    .filter((item) => matchesSearch(item, searchTerm))
    .sort(sortNewestFirst);

  // Searching is a lookup, so it gets one flat list. Otherwise the page leads
  // with the jobs that actually need work and keeps the rest as an archive.
  const isLookup = Boolean(searchTerm || ticketFilter);
  const needsPricing = isLookup ? [] : visible.filter(isUnbilled);
  const everythingElse = isLookup
    ? visible
    : visible.filter((r) => !isUnbilled(r));

  const toggle = (id?: number) =>
    setOpenId((current) => (current === id ? null : (id ?? null)));

  const list = (items: VehicleRepair[]) => (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <PricingRow
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
          onSaveInvoice={onSaveInvoice}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Pricing &amp; Invoice Calculator
        </h2>
        <input
          type="text"
          placeholder="Search by name, plate, service, month or year..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={SEARCH_INPUT_STYLE}
        />
      </div>

      {ticketFilter && (
        <FilterBanner
          label={ticketFilter.label}
          count={visible.length}
          onClear={() => setSearchParams({})}
        />
      )}

      {visible.length === 0 ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-12 text-center text-amstar-ink-dim font-medium`}
        >
          {isLookup
            ? "No vehicles match your search."
            : "No vehicles in the system to price."}
        </div>
      ) : (
        <>
          {needsPricing.length > 0 && (
            <section>
              <h3 className="mb-2 font-cond text-xs font-bold uppercase tracking-[0.2em] text-amstar-red-ink">
                Needs Pricing ({needsPricing.length})
              </h3>
              {list(needsPricing)}
            </section>
          )}

          {everythingElse.length > 0 && (
            <section>
              <h3 className="mb-2 font-cond text-xs font-bold uppercase tracking-[0.2em] text-amstar-ink-dim">
                {isLookup
                  ? `Results (${everythingElse.length})`
                  : `All Vehicles (${everythingElse.length})`}
              </h3>
              {list(everythingElse)}
            </section>
          )}
        </>
      )}
    </div>
  );
};
