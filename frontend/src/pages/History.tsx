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
import { invoiceTotal } from "../lib/ticketFilters";

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

  const completedRepairs = repairs
    .filter((r) => r.status === "COMPLETED")
    .filter((item) => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        item.customerName?.toLowerCase().includes(lower) ||
        item.vehicle?.licensePlate?.toLowerCase().includes(lower) ||
        item.vehicle?.vin?.toLowerCase().includes(lower) ||
        item.vehicle?.make?.toLowerCase().includes(lower) ||
        item.vehicle?.model?.toLowerCase().includes(lower) ||
        item.assignedWorker?.toLowerCase().includes(lower) ||
        item.serviceType?.toLowerCase().includes(lower)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.actualCompletionDate || b.expectedCompletionDate).getTime() -
        new Date(a.actualCompletionDate || a.expectedCompletionDate).getTime(),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Completed Services Ledger
        </h2>
        <input
          type="text"
          placeholder="Search history by name, VIN, plate..."
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
                  className={`${PANEL_HEADING_STYLE} p-3 w-[8%] hidden lg:table-cell`}
                >
                  Entry Date
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[11%]`}>
                  Completion Date
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[11%]`}>
                  Customer
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[8%]`}>
                  Vehicle Image
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[8%]`}>
                  License Plate
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-3 w-[10%] hidden md:table-cell`}
                >
                  Vehicle Details
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[13%]`}>
                  Service Details
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[10%]`}>
                  Technician(s)
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3 w-[11%] text-right`}>
                  Total Price
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-3 w-[11%] text-center`}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amstar-line-soft">
              {completedRepairs.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onDeleteClick(item.id!)}
                  className={`hover:bg-amstar-red/20 transition cursor-pointer group ${viewedRepairId === item.id ? "bg-amstar-raised" : "bg-amstar-surface"}`}
                  title="Click to delete this ticket"
                >
                  <td className="p-3 font-mono tabular-nums text-amstar-ink-dim truncate hidden lg:table-cell">
                    {item.entryDate}
                  </td>
                  <td className="p-3 font-bold font-mono tabular-nums text-amstar-ink truncate">
                    {item.actualCompletionDate || item.expectedCompletionDate}
                  </td>
                  <td className="p-3 font-semibold text-amstar-ink truncate">
                    {item.customerName}
                  </td>
                  <td className="p-3">
                    {item.vehicle?.carImageUrl ? (
                      <img
                        src={item.vehicle.carImageUrl}
                        alt="Vehicle Image"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDeepDive(item);
                        }}
                        className="w-16 h-10 object-cover rounded shadow-sm hover:scale-110 transition duration-200"
                      />
                    ) : (
                      <span className="text-amstar-ink-faint">No Image</span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="inline-block border border-amstar-line bg-amstar-raised px-2 py-1 rounded-md text-center font-bold font-mono tabular-nums shadow-sm">
                      {item.vehicle?.licensePlate}
                      <span className="text-[9px] block text-amstar-ink-dim leading-none mt-0.5">
                        {item.vehicle?.state}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 font-medium text-amstar-ink truncate hidden md:table-cell">
                    {item.vehicle?.year} {item.vehicle?.make}{" "}
                    {item.vehicle?.model}
                  </td>

                  <td
                    className="p-1 md:p-1 max-lg:py-2"
                    title=""
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ServicesCell
                      value={item.serviceType}
                      historicalMap={historicalServiceMap}
                      onChange={(newService) =>
                        onServiceChange(item.id!, newService)
                      }
                      subtitle={`${item.vehicle?.year ?? ""} ${item.vehicle?.make ?? ""} ${item.vehicle?.model ?? ""} - ${item.customerName}`.trim()}
                    />
                  </td>

                  <td
                    className="p-1"
                    title=""
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MultiWorkerDropdown
                      variant="inline"
                      currentWorkers={item.assignedWorker}
                      technicianNames={technicianNames}
                      onAssign={(workers) => onAssignWorker(item.id!, workers)}
                    />
                  </td>

                  <td className="px-2 py-3 font-black text-emerald-400 text-xs lg:text-sm text-right truncate">
                    ${invoiceTotal(item).toFixed(2)}
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      value={item.status || "PENDING"}
                      onChange={(val) => onStatusChange(item.id!, val)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
