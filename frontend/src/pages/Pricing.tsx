import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  PANEL_STYLE,
  PRIMARY_BUTTON_STYLE,
} from "../styles/controls";
import { Truncated } from "../components/Truncated";
import { CurrencyInput } from "../components/CurrencyInput";
import { useSearchParams } from "react-router-dom";
import { matchesSearch, parseTicketFilter } from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";

/**
 * One labelled fact on the vehicle side of a pricing card.
 *
 * VIN, plate and technicians used to carry three different treatments - a mono
 * chip on `field`, a centred chip on `raised` with a nested state line, and
 * bare bold text - three visual languages for three facts in the same 200px
 * column. One shape for all of them instead.
 */
const Fact: React.FC<{
  label: string;
  value?: string | null;
  fallback?: string;
  mono?: boolean;
}> = ({ label, value, fallback = "N/A", mono = false }) => (
  <div className="min-w-0">
    <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
      {label}
    </span>
    <Truncated
      value={value || fallback}
      className={`block px-2 py-1 bg-amstar-field border border-amstar-line rounded-sm text-[11px] font-bold text-amstar-ink ${
        mono ? "font-mono tabular-nums" : ""
      }`}
    />
  </div>
);

const PricingCard: React.FC<{
  item: VehicleRepair;
  onSavePricing: (id: number, payload: any) => void;
}> = ({ item, onSavePricing }) => {
  const [retailPrice, setRetailPrice] = useState<number>(item.retailPrice || 0);
  const [leasePrice, setLeasePrice] = useState<number>(item.leasePrice || 0);
  const [laborPrice, setLaborPrice] = useState<number>(item.laborPrice || 0);

  const [includeRetail, setIncludeRetail] = useState<boolean>(
    item.includeRetail || false,
  );
  const [includeLease, setIncludeLease] = useState<boolean>(
    item.includeLease || false,
  );
  const [includeLabor, setIncludeLabor] = useState<boolean>(
    item.includeLabor || false,
  );

  const [isSaving, setIsSaving] = useState(false);

  const currentTotal =
    (includeRetail ? retailPrice : 0) +
    (includeLease ? leasePrice : 0) +
    (includeLabor ? laborPrice : 0);

  const handleSave = async () => {
    setIsSaving(true);
    await onSavePricing(item.id!, {
      retailPrice,
      leasePrice,
      laborPrice,
      includeRetail,
      includeLease,
      includeLabor,
    });
    // Small delay to let the UI feel like it "did work" before resetting button state
    setTimeout(() => setIsSaving(false), 400);
  };

  /**
   * Including a line moves one thing: a red edge on the left. It used to swap
   * the background, the border colour, an inset shadow for a drop shadow and
   * the hover border all at once, which made the row appear to jump.
   */
  const rowStyle = (isActive: boolean) =>
    `flex items-center gap-2.5 px-2.5 py-2 bg-amstar-ground border border-amstar-line
    border-l-[3px] rounded-sm transition-colors cursor-pointer ${
      isActive ? "border-l-amstar-red" : "border-l-amstar-line"
    }`;

  const priceRow = (
    label: string,
    included: boolean,
    setIncluded: (on: boolean) => void,
    value: number,
    setValue: (n: number) => void,
  ) => (
    <label className={rowStyle(included)}>
      <input
        type="checkbox"
        checked={included}
        onChange={(e) => setIncluded(e.target.checked)}
        aria-label={`Include ${label.toLowerCase()}`}
        className="w-[17px] h-[17px] shrink-0 accent-amstar-red cursor-pointer"
      />
      <span
        className={`flex-1 min-w-0 truncate text-xs font-bold ${
          included ? "text-amstar-ink" : "text-amstar-ink-faint"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-xs ${
          included ? "text-amstar-ink-dim" : "text-amstar-ink-faint"
        }`}
      >
        $
      </span>
      <CurrencyInput
        value={value}
        onChange={setValue}
        disabled={!included}
        aria-label={`${label} price`}
      />
    </label>
  );

  return (
    <div
      className={`${PANEL_STYLE} overflow-hidden flex flex-col md:flex-row h-full`}
    >
      {/* Left: what is being priced */}
      <div className="p-5 flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-amstar-line-soft">
        {item.vehicle?.carImageUrl ? (
          <img
            src={item.vehicle.carImageUrl}
            alt=""
            className="w-full h-28 object-cover rounded-sm border border-amstar-line"
          />
        ) : (
          <div className="w-full h-28 grid place-items-center rounded-sm border border-dashed border-amstar-line bg-amstar-field font-cond uppercase tracking-widest text-[10px] text-amstar-ink-faint">
            No Image
          </div>
        )}

        <div className="mt-3">
          <h3 className="font-cond text-lg font-bold uppercase tracking-wider text-amstar-ink leading-tight line-clamp-2">
            {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amstar-ink-dim">
            {item.serviceType}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-[1.25fr_1fr] gap-2">
          <Fact label="VIN" value={item.vehicle?.vin} mono />
          <Fact
            label="Plate"
            value={
              item.vehicle?.licensePlate
                ? `${item.vehicle.licensePlate}${item.vehicle?.state ? ` \u00b7 ${item.vehicle.state}` : ""}`
                : null
            }
            mono
          />
        </div>
        <div className="mt-2">
          <Fact
            label="Technician(s)"
            value={item.assignedWorker}
            fallback="Unassigned"
          />
        </div>
      </div>

      {/* Right: the invoice */}
      <div className="p-5 w-full md:w-[268px] md:shrink-0 bg-amstar-field flex flex-col">
        <span className="block font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-amstar-ink-dim">
          Invoice Breakdown
        </span>

        <div className="mt-2.5 flex flex-col gap-2">
          {priceRow(
            "Retail",
            includeRetail,
            setIncludeRetail,
            retailPrice,
            setRetailPrice,
          )}
          {priceRow(
            "Wholesale",
            includeLease,
            setIncludeLease,
            leasePrice,
            setLeasePrice,
          )}
          {priceRow(
            "Labor",
            includeLabor,
            setIncludeLabor,
            laborPrice,
            setLaborPrice,
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-amstar-line-soft">
          <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
            Total Billed
          </span>
          <span
            className={`block truncate font-mono tabular-nums text-4xl font-bold tracking-tight leading-none ${
              currentTotal > 0 ? "text-sev-1" : "text-amstar-ink-faint"
            }`}
          >
            ${currentTotal.toFixed(2)}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${PRIMARY_BUTTON_STYLE} w-full mt-3 min-h-11 text-xs`}
          >
            {isSaving ? "Saving..." : "Save Pricing"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PricingPage: React.FC<{
  repairs: VehicleRepair[];
  onSavePricing: (id: number, payload: any) => void;
}> = ({ repairs, onSavePricing }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketFilter = parseTicketFilter(searchParams.get("filter"));

  // Filter repairs by search term
  const filteredRepairs = repairs
    .filter((r) => !ticketFilter || ticketFilter.matches(r))
    .filter((item) => matchesSearch(item, searchTerm))
    // Optional: Sort by active first, then completed
    .sort((a, b) => {
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
      return (b.id || 0) - (a.id || 0);
    });

  return (
    <div className="space-y-6">
      {/* Header & Unified Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Pricing & Invoice Calculator
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
          count={filteredRepairs.length}
          onClear={() => setSearchParams({})}
        />
      )}

      {filteredRepairs.length === 0 ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-12 text-center text-amstar-ink-dim font-medium`}
        >
          {searchTerm || ticketFilter
            ? "No vehicles match your search."
            : "No vehicles in the system to price."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRepairs.map((item) => (
            <PricingCard
              key={item.id}
              item={item}
              onSavePricing={onSavePricing}
            />
          ))}
        </div>
      )}
    </div>
  );
};
