import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import { RepairForm } from "../components/RepairForm";
import {
  SEARCH_INPUT_STYLE,
  TABLE_DROPDOWN_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  SEVERITY_TEXT,
  getSeverityColor,
  getSeverityGlow,
  getStatusStyle,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";
import { Truncated } from "../components/Truncated";
import { ServicesCell } from "../components/ServicesCell";

const MultiWorkerDropdown: React.FC<{
  currentWorkers: string | undefined;
  onAssign: (workers: string) => void;
  technicianNames: string[];
}> = ({ currentWorkers, onAssign, technicianNames }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const workersList = technicianNames;

  const selectedArray = currentWorkers
    ? currentWorkers
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w !== "")
    : [];

  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName)
      ? selectedArray.filter((w) => w !== workerName)
      : [...selectedArray, workerName];
    onAssign(updatedSelection.join(", "));
  };

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { top, left } = panelCoords(rect, 226, 192);
    setCoords({ top, left });
    setIsOpen(true);
  };

  return (
    <>
      <div
        onClick={openDropdown}
        className={`${TABLE_DROPDOWN_STYLE} flex justify-between items-center min-w-[130px] max-w-[180px]`}
      >
        <Truncated
          value={
            selectedArray.length === 0 ? "Unassigned" : selectedArray.join(", ")
          }
          className="flex-1"
          tapToReveal={false}
        />
        <span className="text-[10px] ml-2 text-amstar-ink-faint shrink-0">
          ▼
        </span>
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={`${FLOATING_PANEL_STYLE} w-48`}
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${PANEL_HEADING_STYLE} bg-amstar-raised px-3 py-2 border-b border-amstar-line-soft text-[10px] font-black`}
            >
              Assign Technicians
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map((worker) => {
                const isOn = selectedArray.includes(worker);
                return (
                  <button
                    key={worker}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    onClick={() => handleToggle(worker)}
                    className={`w-full min-h-10 flex items-center gap-3 px-2 py-2 rounded-sm text-left transition-colors ${isOn ? "bg-amstar-surface" : "hover:bg-amstar-surface"}`}
                  >
                    <span
                      className={`shrink-0 w-4 h-4 rounded-sm border grid place-items-center text-[10px] font-black ${isOn ? "bg-amstar-red border-amstar-red text-white" : "border-amstar-line"}`}
                    >
                      {isOn ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-xs font-bold text-amstar-ink">
                      {worker}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// === NEW: UNIFIED STATUS DROPDOWN ===
const StatusDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const options = [
    { val: "PENDING", label: "PENDING" },
    { val: "IN_PROGRESS", label: "IN PROGRESS" },
    { val: "COMPLETED", label: "COMPLETED" },
  ];

  const currentLabel =
    options.find((o) => o.val === value)?.label || value?.replace("_", " ");

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords(panelCoords(rect, 3 * 38, 130));
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full min-w-[120px]">
      <div
        onClick={openDropdown}
        className={`px-3 py-1.5 rounded-sm text-xs font-bold cursor-pointer transition-all flex justify-between items-center border ${getStatusStyle(value)}`}
      >
        <span className="truncate flex-1 text-center">{currentLabel}</span>
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={FLOATING_PANEL_STYLE}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((opt) => (
              <div
                key={opt.val}
                onClick={() => handleSelect(opt.val)}
                className={`${PANEL_ROW_STYLE} text-center`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const ActiveQueue: React.FC<{
  repairs: VehicleRepair[];
  isAdmin: boolean;
  currentUser: string;
  historicalServiceMap: Record<string, number>;
  onRefresh: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAssignWorker: (id: number, workers: string) => void;
  technicianNames: string[];
  onServiceChange: (id: number, service: string) => void;
  onDeleteClick: (id: number) => void;
  onViewDeepDive: (repair: VehicleRepair) => void;
  viewedRepairId?: number | null;
}> = ({
  repairs,
  isAdmin,
  currentUser,
  historicalServiceMap,
  technicianNames,
  onRefresh,
  onStatusChange,
  onAssignWorker,
  onServiceChange,
  onDeleteClick,
  onViewDeepDive,
  viewedRepairId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const activeRepairs = repairs
    .filter((r) => r.status !== "COMPLETED")
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
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return (
    <div className="space-y-6">
      {isAdmin && (
        <RepairForm
          onSuccess={onRefresh}
          currentUser={currentUser}
          isAdmin={isAdmin}
          historicalServiceMap={historicalServiceMap}
          technicianNames={technicianNames}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Shop Active Repairs
        </h2>
        <input
          type="text"
          placeholder="Search by name, VIN, plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={SEARCH_INPUT_STYLE}
        />
      </div>

      {activeRepairs.length === 0 ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-8 text-center text-amstar-ink-dim`}
        >
          {searchTerm
            ? "No active repairs match your search."
            : "No active repairs in the shop queue."}
        </div>
      ) : (
        <div className={`${PANEL_STYLE} overflow-x-auto`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-amstar-raised border-b border-amstar-line">
              <tr>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Customer</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Vehicle Image</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>License Plate</th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-3 hidden md:table-cell`}
                >
                  Vehicle Details
                </th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Service</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Severity</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Entry Date</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Due Date</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Technician(s)</th>
                <th className={`${PANEL_HEADING_STYLE} p-3 text-center`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amstar-line-soft">
              {activeRepairs.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => isAdmin && onDeleteClick(item.id!)}
                  className={`transition ${
                    isAdmin ? "hover:bg-amstar-red/20 cursor-pointer" : ""
                  } ${
                    viewedRepairId === item.id
                      ? "bg-amstar-raised"
                      : index === 0 && !searchTerm
                        ? "bg-sev-3/20"
                        : "bg-amstar-surface"
                  }`}
                  title={isAdmin ? "Click to delete this repair" : ""}
                >
                  <td className="p-3 font-semibold text-amstar-ink">
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
                    <div className="inline-block border border-amstar-line bg-amstar-raised px-2 py-1 rounded-md text-center font-bold font-mono tabular-nums shadow-sm min-w-[70px]">
                      {item.vehicle?.licensePlate}
                      <span className="text-[9px] block text-amstar-ink-dim leading-none mt-0.5">
                        {item.vehicle?.state}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 font-medium text-amstar-ink hidden md:table-cell">
                    {item.vehicle?.year} {item.vehicle?.make}{" "}
                    {item.vehicle?.model}
                  </td>

                  <td className="p-1 md:p-1 max-lg:py-2 max-w-[220px]" title="">
                    <ServicesCell
                      value={item.serviceType}
                      historicalMap={historicalServiceMap}
                      onChange={(newService) =>
                        onServiceChange(item.id!, newService)
                      }
                      readOnly={!isAdmin}
                      subtitle={`${item.vehicle?.year ?? ""} ${item.vehicle?.make ?? ""} ${item.vehicle?.model ?? ""} - ${item.customerName}`.trim()}
                    />
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider ${SEVERITY_TEXT} text-[11px] ${getSeverityColor(item.severity)} ${getSeverityGlow(item.severity)}`}
                    >
                      Level {item.severity}
                    </span>
                  </td>

                  <td className="p-3 font-mono tabular-nums text-amstar-ink-dim lg:table-cell">
                    {item.entryDate}
                  </td>
                  <td className="p-3 font-mono tabular-nums font-semibold text-amstar-ink">
                    {item.expectedCompletionDate}
                  </td>

                  <td
                    className="p-1"
                    title=""
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAdmin ? (
                      <MultiWorkerDropdown
                        currentWorkers={item.assignedWorker}
                        technicianNames={technicianNames}
                        onAssign={(workers) =>
                          onAssignWorker(item.id!, workers)
                        }
                      />
                    ) : (
                      <span className="font-bold text-amstar-ink">
                        {item.assignedWorker || "Unassigned"}
                      </span>
                    )}
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <StatusDropdown
                        value={item.status || "PENDING"}
                        onChange={(val) => onStatusChange(item.id!, val)}
                      />
                    ) : (
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-center border whitespace-nowrap ${getStatusStyle(item.status)}`}
                      >
                        {item.status?.replace("_", " ")}
                      </div>
                    )}
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
