import React, { useState } from "react";
import type { LineItem, VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  PANEL_STYLE,
  PRIMARY_BUTTON_STYLE,
  HOVER,
  getStatusStyle,
} from "../styles/controls";
import { Truncated } from "../components/Truncated";
import { CurrencyInput } from "../components/CurrencyInput";
import { useSearchParams } from "react-router-dom";
import {
  invoiceTotal,
  isReadyForInvoice,
  matchesSearch,
  money,
  parseTicketFilter,
  technicianList,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";
import { PlateChip } from "../components/PlateChip";
import { PartsEditor } from "../components/PartsEditor";

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

const PAD_LABEL =
  "block font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-amstar-ink-dim";

const PAD_INPUT =
  "mt-2 w-full min-h-24 px-3 py-2 bg-amstar-ground border border-amstar-line rounded-sm text-xs font-medium text-amstar-ink placeholder:text-amstar-ink-faint transition-[border-color] duration-150 ease-out focus:border-amstar-red-edge focus:outline-none";

/** What the Save button sends. Shared so the page and the row cannot drift. */
export type InvoicePayload = {
  lineItems: LineItem[];
  laborPrice: number;
  notes: string;
  parts: string;
};

export type SaveInvoice = (id: number, payload: InvoicePayload) => void;

/**
 * Everything needed to write one invoice, in the expanded row.
 *
 * <p>The parts and their costs usually arrive from the bookkeeper, who entered
 * them from the modal on the queue; this is where the owner checks them, adds
 * labor, and writes down anything the invoice needs to say. Labor lives here and
 * not in that modal because PATCH /pricing is ADMIN-only.
 */
const InvoiceEditor: React.FC<{
  item: VehicleRepair;
  onSaveInvoice: SaveInvoice;
  onMarkInvoiced: (id: number) => void;
}> = ({ item, onSaveInvoice, onMarkInvoiced }) => {
  const [lines, setLines] = useState<LineItem[]>(item.lineItems ?? []);
  const [laborPrice, setLaborPrice] = useState<number>(item.laborPrice || 0);
  const [notes, setNotes] = useState<string>(item.notes ?? "");
  const [parts, setParts] = useState<string>(item.parts ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const partsTotal = lines.reduce(
    (sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 0),
    0,
  );
  const currentTotal = partsTotal + laborPrice;
  const technicians = technicianList(item);

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
      notes,
      parts,
    });
    setTimeout(() => setIsSaving(false), 400);
  };

  return (
    <div className="anim-rise border-t border-amstar-line-soft bg-amstar-field p-4 sm:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Fact label="Customer" value={item.customerName} />
        <Fact label="Plate">
          <PlateChip vehicle={item.vehicle} />
        </Fact>
        <Fact label="Vehicle" value={vehicleLabel(item)} />
        <Fact label="VIN" value={item.vehicle?.vin} mono />
        <Fact label="Service" value={item.serviceType} />
        <Fact
          label="Technician(s)"
          value={technicians.join(", ")}
          fallback="Unassigned"
        />
        <Fact label="In" value={usDate(item.entryDate)} mono />
        {/* The repair finished, not the invoice. Nothing records the latter. */}
        <Fact
          label="Repair done"
          value={usDate(item.actualCompletionDate)}
          fallback="Not yet"
          mono
        />
      </div>

      <PartsEditor lines={lines} onChange={setLines} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <span className={PAD_LABEL}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            placeholder="Anything the invoice needs to say."
            aria-label="Invoice notes"
            className={PAD_INPUT}
          />
        </div>
        <div>
          <span className={PAD_LABEL}>Parts notes</span>
          <textarea
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            maxLength={2000}
            placeholder="Where the parts came from, order numbers, anything loose."
            aria-label="Parts notes"
            className={PAD_INPUT}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-amstar-line-soft flex flex-wrap items-end justify-between gap-4">
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
                currentTotal > 0 ? "text-sev-1" : "text-amstar-ink-faint"
              }`}
            >
              {money(currentTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${PRIMARY_BUTTON_STYLE} min-h-11 px-8 text-xs`}
          >
            {isSaving ? "Saving..." : "Save invoice"}
          </button>
          {/*
           * The only way a car leaves this page. Offered once the shop has said
           * the work is done; completing it is what moves the ticket to History.
           */}
          {isReadyForInvoice(item) && (
            <button
              type="button"
              onClick={() => item.id && onMarkInvoiced(item.id)}
              className={`min-h-11 px-5 rounded-sm border border-amstar-red-edge bg-transparent font-cond text-xs font-bold uppercase tracking-widest text-amstar-red-ink hover:bg-amstar-red hover:text-white active:translate-y-px transition-[color,background-color,transform] duration-150 ease-out`}
            >
              Invoiced
            </button>
          )}
        </div>
      </div>

      {currentTotal === 0 && (
        <p className="mt-3 text-sm font-medium text-amstar-red-ink">
          Nothing priced yet. Check the parts with the shop before invoicing.
        </p>
      )}
    </div>
  );
};

/** One ticket: a scannable summary line that opens its editor in place. */
const PricingRow: React.FC<{
  item: VehicleRepair;
  isOpen: boolean;
  onToggle: () => void;
  onSaveInvoice: SaveInvoice;
  onMarkInvoiced: (id: number) => void;
  index: number;
}> = ({ item, isOpen, onToggle, onSaveInvoice, onMarkInvoiced, index }) => {
  const total = invoiceTotal(item);

  return (
    /*
     * Rows deal in one after another, the same 25ms step the queue list uses.
     * Capped at ten: past that the stagger stops reading as sequence and
     * starts reading as the page being slow.
     */
    <div
      style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
      className={`anim-row ${PANEL_STYLE} overflow-hidden`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-3 px-3 sm:px-4 min-h-12 text-left hover:bg-amstar-surface ${HOVER} active:translate-y-px`}
      >
        <PlateChip vehicle={item.vehicle} className="shrink-0" />
        <span className="flex-1 min-w-0 truncate font-cond text-sm font-bold uppercase tracking-wide text-amstar-ink">
          {vehicleLabel(item)}
        </span>
        <span className="hidden md:block w-32 shrink-0 truncate text-xs text-amstar-ink-dim">
          {item.customerName}
        </span>
        <span className="hidden xl:block w-24 shrink-0 truncate text-xs text-amstar-ink-faint">
          {technicianList(item).join(", ") || "Unassigned"}
        </span>
        <span
          className={`hidden sm:block shrink-0 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase ${getStatusStyle(item.status)}`}
        >
          {item.status.replace(/_/g, " ")}
        </span>
        <span
          className={`w-24 shrink-0 text-right font-mono tabular-nums text-sm font-bold ${
            total === 0 ? "text-amstar-red-ink" : "text-amstar-ink"
          }`}
        >
          {money(total)}
        </span>
        <span
          aria-hidden="true"
          className={`w-4 shrink-0 text-center text-xs text-amstar-ink-faint transition-transform duration-200 ease-out ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>

      {isOpen && (
        <InvoiceEditor
          item={item}
          onSaveInvoice={onSaveInvoice}
          onMarkInvoiced={onMarkInvoiced}
        />
      )}
    </div>
  );
};

/**
 * The Invoices page. Admin only - the route and the nav link both check it, and
 * every write it makes (/pricing, /notes, /parts) is ADMIN-only on the server.
 */
export const PricingPage: React.FC<{
  repairs: VehicleRepair[];
  onSaveInvoice: SaveInvoice;
  onMarkInvoiced: (id: number) => void;
}> = ({ repairs, onSaveInvoice, onMarkInvoiced }) => {
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
  // with the cars waiting on an invoice and keeps the rest as an archive.
  const isLookup = Boolean(searchTerm || ticketFilter);
  const needsInvoicing = isLookup ? [] : visible.filter(isReadyForInvoice);
  const everythingElse = isLookup
    ? visible
    : visible.filter((r) => !isReadyForInvoice(r));

  const toggle = (id?: number) =>
    setOpenId((current) => (current === id ? null : (id ?? null)));

  const list = (items: VehicleRepair[]) => (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <PricingRow
          key={item.id}
          item={item}
          index={i}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
          onSaveInvoice={onSaveInvoice}
          onMarkInvoiced={onMarkInvoiced}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Invoices
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
            : "No vehicles in the system to invoice."}
        </div>
      ) : (
        <>
          {needsInvoicing.length > 0 && (
            <section>
              <h3 className="mb-2 font-cond text-xs font-bold uppercase tracking-[0.2em] text-amstar-red-ink">
                Needs Invoicing ({needsInvoicing.length})
              </h3>
              {list(needsInvoicing)}
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
