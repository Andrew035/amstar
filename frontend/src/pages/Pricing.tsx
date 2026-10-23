import React, { useState } from "react";
import type { LineItem, VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  PANEL_STYLE,
  PRIMARY_BUTTON_STYLE,
  HOVER,
  getStatusStyle,
  PRESS,
} from "../styles/controls";
import { CurrencyInput } from "../components/CurrencyInput";
import { useSearchParams } from "react-router-dom";
import {
  invoiceTotal,
  isReadyForInvoice,
  matchesSearch,
  miles,
  money,
  phone,
  parseTicketFilter,
  technicianList,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";
import { PlateChip } from "../components/PlateChip";
import { DropdownArrow } from "../components/DropdownArrow";
import { Fact } from "../components/Fact";
import { PartsEditor } from "../components/PartsEditor";

const PAD_LABEL =
  "block font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-amstar-ink-dim";

const PAD_INPUT =
  "mt-2 w-full min-h-24 px-3 py-2 bg-amstar-ground border border-amstar-line rounded-sm text-xs font-medium text-amstar-ink placeholder:text-amstar-ink-faint transition-[border-color] duration-150 ease-out focus:border-amstar-red-edge focus:outline-none";

/** What the Save button sends. Shared so the page and the row cannot drift. */
export type InvoicePayload = {
  lineItems: LineItem[];
  laborPrice: number;
  notes: string;
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
    });
    setTimeout(() => setIsSaving(false), 400);
  };

  return (
    <div className="anim-rise border-t border-amstar-line-soft bg-amstar-field p-4 sm:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Fact label="Customer" value={item.customerName} />
        <Fact label="Phone" value={phone(item.customerPhone)} fallback="-" />
        <Fact label="Plate">
          <PlateChip vehicle={item.vehicle} />
        </Fact>
        <Fact label="Vehicle" value={vehicleLabel(item)} />
        <Fact label="VIN" value={item.vehicle?.vin} mono />
        <Fact
          label="Mileage"
          value={miles(item.vehicle?.mileage)}
          fallback="-"
          mono
        />
        <Fact label="Service" value={item.serviceType} />
        <Fact
          label="Technician(s)"
          value={technicians.join(", ")}
          fallback="Unassigned"
        />
        <Fact label="In the shop" value={usDate(item.entryDate)} mono />
        {/* The repair finished, not the invoice. Nothing records the latter. */}
        <Fact
          label="Repair done"
          value={usDate(item.actualCompletionDate)}
          fallback="Not yet"
          mono
        />
      </div>

      <PartsEditor lines={lines} onChange={setLines} />

      <div className="mt-5">
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
      </div>

      <div className="mt-4 pt-4 border-t border-amstar-line-soft flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-6">
          <div>
            <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">
              Parts
            </span>
            <span className="flex min-h-11 items-center font-mono text-sm tabular-nums text-amstar-ink">
              {money(partsTotal)}
            </span>
          </div>
          <div>
            <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">
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
            <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">
              Total
            </span>
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
              className={`min-h-11 px-5 rounded-sm border border-amstar-red-edge bg-transparent font-cond text-xs font-bold uppercase tracking-widest text-amstar-red-ink hover:bg-amstar-red hover:text-white ${PRESS} transition-[color,background-color,transform] duration-150 ease-out`}
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

/*
 * One grid template for the header and every row, so the columns actually line
 * up. The row used to be a flex line where the vehicle cell was `flex-1` and
 * swallowed all the slack - 556px of cell holding 180px of text, leaving a
 * ~370px hole in the middle of every row. Aligned columns are also what made
 * History read as a ledger while this page read as a stack of cards.
 *
 * Every track is a fixed width except the vehicle. Each row is its own grid
 * container, so an `auto` track sizes to that row's content alone - a wide
 * plate like "412j151j · MD" pushed its row's columns out of line with the
 * rest. Fixed tracks are what makes separate rows read as one table.
 *
 * Each breakpoint names exactly as many tracks as there are visible children:
 * a `hidden md:block` cell is display:none below md and occupies no track, so
 * the counts have to match or everything shifts a column.
 */
const INVOICE_GRID =
  "grid items-center gap-3 grid-cols-[7.5rem_1fr_7.5rem_6rem_1.25rem] " +
  "md:grid-cols-[7.5rem_1fr_9rem_7.5rem_6rem_1.25rem] " +
  "xl:grid-cols-[7.5rem_1fr_9rem_7rem_7.5rem_6rem_1.25rem]";

/** One ticket: a scannable summary line that opens its editor in place. */
const PricingRow: React.FC<{
  item: VehicleRepair;
  isOpen: boolean;
  onToggle: () => void;
  onSaveInvoice: SaveInvoice;
  onMarkInvoiced: (id: number) => void;
}> = ({ item, isOpen, onToggle, onSaveInvoice, onMarkInvoiced }) => {
  const total = invoiceTotal(item);

  return (
    <div className={`${PANEL_STYLE} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full ${INVOICE_GRID} px-3 sm:px-4 min-h-12 text-left hover:bg-amstar-surface ${HOVER} ${PRESS}`}
      >
        <PlateChip vehicle={item.vehicle} className="shrink-0" />
        <span className="min-w-0 truncate font-cond text-sm font-bold uppercase tracking-wide text-amstar-ink">
          {vehicleLabel(item)}
        </span>
        <span className="hidden md:block min-w-0 truncate text-xs text-amstar-ink-dim">
          {item.customerName}
        </span>
        <span className="hidden xl:block min-w-0 truncate text-xs text-amstar-ink-faint">
          {technicianList(item).join(", ") || "Unassigned"}
        </span>
        {/*
          The cell is always rendered so the grid keeps its shape, but only an
          unexpected status earns a chip. In this archive 20 of 28 rows were
          COMPLETED, so the column was mostly one word repeated - the rows that
          are still open are the ones worth spotting.
        */}
        <span className="min-w-0">
          {item.status !== "COMPLETED" && (
            <span
              className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase ${getStatusStyle(item.status)}`}
            >
              {item.status.replace(/_/g, " ")}
            </span>
          )}
        </span>
        {/*
          Not priced yet is not an alarm. red-ink is the colour this app uses
          for something wrong; an unpriced job is just work the owner has not
          got to, so it recedes instead.
        */}
        <span
          className={`text-right font-mono tabular-nums text-sm font-bold ${
            total === 0 ? "text-amstar-ink-faint" : "text-amstar-ink"
          }`}
        >
          {money(total)}
        </span>
        <DropdownArrow isOpen={isOpen} />
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
 * every write it makes (/line-items, /pricing, /notes) is ADMIN-only on the server.
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

  const columnHeader = (
    <div
      aria-hidden="true"
      className={`${INVOICE_GRID} px-3 sm:px-4 pb-1 font-cond uppercase tracking-widest text-[10px] text-amstar-ink-faint`}
    >
      <span>Plate</span>
      <span>Vehicle</span>
      <span className="hidden md:block">Customer</span>
      <span className="hidden xl:block">Technician(s)</span>
      <span />
      <span className="text-right">Total</span>
      <span />
    </div>
  );

  const list = (items: VehicleRepair[]) => (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <PricingRow
          key={item.id}
          item={item}
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
          placeholder="Name, plate, service or date"
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
              {columnHeader}
              {list(needsInvoicing)}
            </section>
          )}

          {everythingElse.length > 0 && (
            <section>
              <h3 className="mb-2 font-cond text-xs font-bold uppercase tracking-[0.2em] text-amstar-ink-dim">
                {isLookup
                  ? `Results (${everythingElse.length})`
                  : `All invoices (${everythingElse.length})`}
              </h3>
              {columnHeader}
              {list(everythingElse)}
            </section>
          )}
        </>
      )}
    </div>
  );
};
