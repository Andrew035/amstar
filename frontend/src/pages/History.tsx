import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import {
  SEARCH_INPUT_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
} from "../styles/controls";
import { ServicesCell } from "../components/ServicesCell";
import { MultiWorkerDropdown } from "../components/WorkerDropdown";
import { StatusDropdown } from "../components/StatusDropdown";
import {
  invoiceTotal,
  matchesSearch,
  monthLabel,
  partsSubtotal,
  usDate,
  vehicleLabel,
  isComeback,
} from "../lib/ticketFilters";
import { PlateChip } from "../components/PlateChip";

/** The date a repair closed on - the real one when we have it. */
const closedOn = (r: VehicleRepair): string =>
  r.actualCompletionDate || r.expectedCompletionDate;

/** How long the car was with us. Both ends are UTC midnight, so this is exact. */
const daysInShop = (r: VehicleRepair): string => {
  const end = closedOn(r);
  if (!r.entryDate || !end) return "—";
  const days = Math.round(
    (new Date(end).getTime() - new Date(r.entryDate).getTime()) / 86400000,
  );
  if (days < 0) return "—";
  return days === 1 ? "1 day" : `${days} days`;
};

const money = (n?: number) => (n ? `$${n.toFixed(2)}` : "—");

/** One labelled fact inside an opened row. */
const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
      {label}
    </span>
    <span className="block text-xs text-amstar-ink-dim truncate">
      {children}
    </span>
  </div>
);

export const HistoryPage: React.FC<{
  repairs: VehicleRepair[];
  historicalServiceMap: Record<string, number>;
  onStatusChange: (id: number, status: string) => void;
  onAssignWorker: (id: number, workers: string) => void;
  technicianNames: string[];
  onServiceChange: (id: number, service: string) => void;
  onViewDeepDive: (repair: VehicleRepair) => void;
  onDeleteClick: (id: number) => void;
  viewedRepairId?: number | null;
}> = ({
  repairs,
  historicalServiceMap,
  technicianNames,
  onStatusChange,
  onAssignWorker,
  onServiceChange,
  onViewDeepDive,
  onDeleteClick,
  viewedRepairId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const completedRepairs = repairs
    .filter((r) => r.status === "COMPLETED")
    .filter((item) => matchesSearch(item, searchTerm))
    .sort(
      (a, b) =>
        new Date(closedOn(b)).getTime() - new Date(closedOn(a)).getTime(),
    );

  // How many closed in each month, for the divider rows. Counts only - nothing
  // on this page adds repairs together into a figure.
  const perMonth = completedRepairs.reduce<Record<string, number>>(
    (acc, item) => {
      const key = monthLabel(closedOn(item));
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Completed Services Ledger
        </h2>
        <input
          type="text"
          placeholder="Search by name, plate, service, month or year..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={SEARCH_INPUT_STYLE}
        />
      </div>

      {completedRepairs.length === 0 ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-8 text-center text-amstar-ink-dim`}
        >
          {searchTerm
            ? "No completed repairs match your search."
            : "No completed services recorded yet."}
        </div>
      ) : (
        <div className={`${PANEL_STYLE} overflow-x-auto`}>
          {/* table-fixed: see ActiveQueue - a cell's contents never resize a column. */}
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead className="bg-amstar-raised border-b border-amstar-line">
              <tr>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[9%] hidden xl:table-cell`}
                >
                  Entry
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[14%] xl:w-[12%]`}
                >
                  Completed
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[17%] xl:w-[15%]`}
                >
                  Customer
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[15%] xl:w-[13%]`}
                >
                  Plate
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[22%] xl:w-[19%]`}
                >
                  Service
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[18%] xl:w-[16%]`}
                >
                  Technician(s)
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[14%] xl:w-[16%] text-right`}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amstar-line-soft">
              {completedRepairs.map((item, index) => {
                const month = monthLabel(closedOn(item));
                const startsMonth =
                  index === 0 ||
                  monthLabel(closedOn(completedRepairs[index - 1])) !== month;
                const isOpen = openId === item.id;
                const toggle = () =>
                  setOpenId((current) =>
                    current === item.id ? null : item.id!,
                  );

                return (
                  <React.Fragment key={item.id}>
                    {startsMonth && (
                      <tr className="bg-amstar-field">
                        <th
                          colSpan={7}
                          scope="colgroup"
                          className="p-2 xl:p-3 text-left border-y border-amstar-line"
                        >
                          <span className="font-cond text-xs font-bold uppercase tracking-widest text-amstar-ink">
                            {month}
                          </span>
                          <span className="ml-3 font-mono tabular-nums text-[11px] font-normal text-amstar-ink-faint">
                            {perMonth[month]}{" "}
                            {perMonth[month] === 1 ? "repair" : "repairs"}
                          </span>
                        </th>
                      </tr>
                    )}

                    <tr
                      onClick={toggle}
                      className={`transition-colors cursor-pointer ${
                        isOpen || viewedRepairId === item.id
                          ? "bg-amstar-raised"
                          : "bg-amstar-surface hover:bg-amstar-raised/60"
                      }`}
                    >
                      <td className="p-2 xl:p-3 font-mono tabular-nums text-amstar-ink-faint truncate hidden xl:table-cell">
                        {usDate(item.entryDate)}
                      </td>
                      <td className="p-2 xl:p-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle();
                          }}
                          aria-expanded={isOpen}
                          aria-label={`Details for ${vehicleLabel(item)}`}
                          className="flex items-center gap-2 w-full min-h-8 font-mono tabular-nums font-bold text-amstar-ink"
                        >
                          <span className="shrink-0 text-[9px] text-amstar-ink-faint">
                            {isOpen ? "▼" : "▶"}
                          </span>
                          <span className="truncate">
                            {usDate(closedOn(item))}
                          </span>
                        </button>
                      </td>
                      <td className="p-2 xl:p-3 font-semibold text-amstar-ink truncate">
                        {item.customerName}
                      </td>
                      <td className="p-2 xl:p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PlateChip vehicle={item.vehicle} />
                          {isComeback(item) && (
                            <span className="inline-block px-1.5 rounded-sm bg-amstar-red text-white font-cond text-[9px] font-bold uppercase tracking-wider">
                              Comeback
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="p-1 max-lg:py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ServicesCell
                          value={item.serviceType}
                          historicalMap={historicalServiceMap}
                          onChange={(newService) =>
                            onServiceChange(item.id!, newService)
                          }
                          subtitle={`${vehicleLabel(item)} - ${item.customerName}`}
                        />
                      </td>
                      <td className="p-1" onClick={(e) => e.stopPropagation()}>
                        <MultiWorkerDropdown
                          variant="inline"
                          currentWorkers={item.assignedWorker}
                          technicianNames={technicianNames}
                          onAssign={(workers) =>
                            onAssignWorker(item.id!, workers)
                          }
                        />
                      </td>
                      <td className="px-2 py-2 xl:py-3 font-black text-sev-1 text-xs xl:text-sm text-right truncate">
                        ${invoiceTotal(item).toFixed(2)}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-amstar-field">
                        <td
                          colSpan={7}
                          className="p-4 border-t border-amstar-red"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col lg:flex-row gap-5">
                            {item.vehicle?.carImageUrl ? (
                              <img
                                src={item.vehicle.carImageUrl}
                                alt=""
                                className="shrink-0 w-40 h-28 object-cover rounded-sm border border-amstar-line"
                              />
                            ) : (
                              <div className="shrink-0 w-40 h-28 grid place-items-center rounded-sm border border-dashed border-amstar-line bg-amstar-ground font-cond uppercase tracking-widest text-[10px] text-amstar-ink-faint">
                                No Image
                              </div>
                            )}

                            <div className="flex-1 min-w-0 flex flex-col gap-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Fact label="Vehicle">
                                  {vehicleLabel(item)}
                                </Fact>
                                <Fact label="VIN">
                                  <span className="font-mono">
                                    {item.vehicle?.vin || "N/A"}
                                  </span>
                                </Fact>
                                <Fact label="In the shop">
                                  <span className="font-mono">
                                    {daysInShop(item)}
                                  </span>
                                </Fact>
                                <Fact label="Parts / Labor">
                                  <span className="font-mono">
                                    {money(partsSubtotal(item))} ·{" "}
                                    {money(item.laborPrice)}
                                  </span>
                                </Fact>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
                                    Notes
                                  </span>
                                  <p className="bg-amstar-ground border border-amstar-line rounded-sm p-3 text-xs leading-relaxed text-amstar-ink-dim whitespace-pre-line min-h-[3.5rem]">
                                    {item.notes || "No notes recorded."}
                                  </p>
                                </div>
                                <div>
                                  <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint mb-1">
                                    Parts
                                  </span>
                                  <div className="bg-amstar-ground border border-amstar-line rounded-sm p-3 min-h-[3.5rem]">
                                    {(item.lineItems?.length ?? 0) > 0 ? (
                                      <ul className="space-y-1">
                                        {item.lineItems!.map((li, i) => (
                                          <li
                                            key={i}
                                            className="flex justify-between gap-3 font-mono text-[11px] text-amstar-ink-dim"
                                          >
                                            <span className="truncate">
                                              {li.quantity > 1
                                                ? `${li.quantity}x `
                                                : ""}
                                              {li.description}
                                              {li.vendor
                                                ? ` (${li.vendor})`
                                                : ""}
                                            </span>
                                            <span className="shrink-0 tabular-nums">
                                              $
                                              {(
                                                li.unitPrice * li.quantity
                                              ).toFixed(2)}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="font-mono text-[11px] leading-relaxed text-amstar-ink-dim whitespace-pre-line">
                                        {item.parts || "No parts recorded."}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="lg:w-44 shrink-0 flex flex-col gap-2">
                              <span className="block font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint">
                                Status
                              </span>
                              <StatusDropdown
                                value={item.status || "COMPLETED"}
                                onChange={(val) =>
                                  onStatusChange(item.id!, val)
                                }
                                className="min-h-10"
                              />
                              <button
                                type="button"
                                onClick={() => onViewDeepDive(item)}
                                className="w-full min-h-10 bg-transparent border border-amstar-line hover:bg-amstar-raised text-amstar-ink-dim rounded-sm font-cond uppercase tracking-widest text-xs transition-colors"
                              >
                                Vehicle Record
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteClick(item.id!)}
                                className="w-full min-h-10 bg-transparent border border-amstar-red text-amstar-red-ink hover:bg-amstar-red hover:text-white rounded-sm font-cond uppercase tracking-widest text-xs transition-colors"
                              >
                                Delete Ticket
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
