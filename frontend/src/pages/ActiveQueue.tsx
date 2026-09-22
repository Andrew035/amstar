import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import { RepairForm } from "../components/RepairForm";
import {
  SEARCH_INPUT_STYLE,
  TABLE_DROPDOWN_STYLE,
  INLINE_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  SEVERITY_TEXT,
  getSeverityColor,
  getSeverityGlow,
  getStatusStyle,
  SEVERITY_LABELS,
  OPTION_ROW_STYLE,
} from "../styles/controls";
import { panelCoords } from "../lib/floating";
import { ServicesCell } from "../components/ServicesCell";
import { useSearchParams } from "react-router-dom";
import { parseTicketFilter, usDate } from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";
import { CustomDatePicker } from "../components/CustomDatePicker";
import { MultiWorkerDropdown } from "../components/WorkerDropdown";
import { StatusDropdown } from "../components/StatusDropdown";

/**
 * The customer name, editable in place for the usual reason: it was typed wrong
 * at intake. Saving points this ticket at the corrected name - other tickets
 * keep theirs, so one fix never rewrites another job's paperwork.
 */
const CustomerNameCell: React.FC<{
  value: string;
  onSave: (name: string) => void;
}> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const name = draft.trim();
    setIsEditing(false);
    if (!name || name === value) return setDraft(value);
    onSave(name);
  };

  // The name always stays in the cell and keeps setting the column's width; the
  // input is laid over it while editing. Swapping one for the other resized the
  // column instead, which shifted every column after it sideways.
  return (
    <span className="relative block">
      <span
        onClick={() => {
          setDraft(value);
          setIsEditing(true);
        }}
        title="Click to correct the name"
        className={`${INLINE_INPUT_STYLE} block normal-case truncate ${
          isEditing ? "invisible" : ""
        }`}
      >
        {value}
      </span>

      {isEditing && (
        <input
          type="text"
          value={draft}
          autoFocus
          maxLength={120}
          size={1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(value);
              setIsEditing(false);
            }
          }}
          className={`${INLINE_INPUT_STYLE} normal-case min-w-0 absolute inset-0`}
        />
      )}
    </span>
  );
};

// Admin-only severity picker. Changing it reorders the queue, because severity
// is the heaviest term in priorityScore.
const SeverityDropdown: React.FC<{
  value: number;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const openDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Five 40px rows plus the panel's padding.
    setCoords(panelCoords(rect, 5 * 40 + 8, 176));
    setIsOpen(true);
  };

  const handleSelect = (level: number) => {
    setIsOpen(false);
    if (level !== value) onChange(level);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-cond uppercase
        tracking-wider whitespace-nowrap ${SEVERITY_TEXT} text-[11px] ${getSeverityColor(value)}
        ${getSeverityGlow(value)} hover:brightness-110 transition`}
      >
        {SEVERITY_LABELS[value]}
        <span className="text-[8px] leading-none">▼</span>
      </button>
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
            role="listbox"
            aria-label="Severity"
            className={`${FLOATING_PANEL_STYLE} p-1`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={level === value}
                onClick={() => handleSelect(level)}
                className={`${OPTION_ROW_STYLE} ${level === value ? "bg-amstar-surface" : "hover:bg-amstar-surface"}`}
              >
                <span
                  className={`shrink-0 w-20 text-center px-1.5 py-0.5 rounded-sm font-cond
                  uppercase tracking-wider text-[11px] ${SEVERITY_TEXT} ${getSeverityColor(level)}`}
                >
                  {SEVERITY_LABELS[level]}
                </span>
                <span
                  className={"flex-1 text-xs font-bold text-amstar-ink-dim"}
                >
                  Level {level}
                </span>
                {level === value && (
                  <span className="text-xs font-black text-amstar-red-ink">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
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
  onSeverityChange: (id: number, severity: number) => void;
  onDueDateChange: (id: number, dueDate: string) => void;
  onCustomerNameChange: (id: number, name: string) => void;
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
  onDueDateChange,
  onCustomerNameChange,
  onSeverityChange,
  onAssignWorker,
  onServiceChange,
  onDeleteClick,
  onViewDeepDive,
  viewedRepairId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Set by the dashboard cards, e.g. /queue?filter=overdue
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketFilter = parseTicketFilter(searchParams.get("filter"));

  const activeRepairs = repairs
    .filter((r) => r.status !== "COMPLETED")
    .filter((r) => !ticketFilter || ticketFilter.matches(r))
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
      {isAdmin && !ticketFilter && (
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

      {ticketFilter && (
        <FilterBanner
          label={ticketFilter.label}
          count={activeRepairs.length}
          onClear={() => setSearchParams({})}
        />
      )}

      {activeRepairs.length === 0 ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-8 text-center text-amstar-ink-dim`}
        >
          {searchTerm || ticketFilter
            ? "No active repairs match your search."
            : "No active repairs in the shop queue."}
        </div>
      ) : (
        <div className={`${PANEL_STYLE} overflow-x-auto`}>
          {/* table-fixed: the header sets every column width, so editing a cell -
              picking technicians, changing status - can never resize the table. */}
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead className="bg-amstar-raised border-b border-amstar-line">
              <tr>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[11%] whitespace-nowrap`}
                >
                  Customer
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[9%] xl:w-[8%]`}
                >
                  Vehicle Image
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[10%] xl:w-[9%]`}
                >
                  License Plate
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[17%] xl:w-[15%]`}
                >
                  Service
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[12%] xl:w-[11%] text-center`}
                >
                  Severity
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[8%] whitespace-nowrap hidden xl:table-cell`}
                >
                  Entry Date
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[13%] xl:w-[12%] whitespace-nowrap`}
                >
                  Due Date
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[16%] xl:w-[14%]`}
                >
                  Technician(s)
                </th>
                <th
                  className={`${PANEL_HEADING_STYLE} p-2 xl:p-3 w-[12%] text-center`}
                >
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
                  <td
                    className="p-1 font-semibold text-amstar-ink"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAdmin ? (
                      <CustomerNameCell
                        value={item.customerName}
                        onSave={(name) => onCustomerNameChange(item.id!, name)}
                      />
                    ) : (
                      <span className="px-2 whitespace-nowrap">
                        {item.customerName}
                      </span>
                    )}
                  </td>
                  <td className="p-2 xl:p-3">
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

                  <td className="p-2 xl:p-3">
                    <div className="block border border-amstar-line bg-amstar-raised px-1 py-1 rounded-md text-center font-bold font-mono tabular-nums shadow-sm truncate">
                      {item.vehicle?.licensePlate}
                      <span className="text-[9px] block text-amstar-ink-dim leading-none mt-0.5">
                        {item.vehicle?.state}
                      </span>
                    </div>
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

                  <td className="p-2 xl:p-3 text-center">
                    {isAdmin ? (
                      <SeverityDropdown
                        value={item.severity}
                        onChange={(level) => onSeverityChange(item.id!, level)}
                      />
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider
                            whitespace-nowrap ${SEVERITY_TEXT} text-[11px] ${getSeverityColor(item.severity)}
                            ${getSeverityGlow(item.severity)}`}
                      >
                        {SEVERITY_LABELS[item.severity]}
                      </span>
                    )}
                  </td>

                  <td className="p-2 xl:p-3 font-mono tabular-nums truncate text-amstar-ink-dim hidden xl:table-cell">
                    {usDate(item.entryDate)}
                  </td>
                  <td
                    className="p-1 font-mono tabular-nums font-semibold text-amstar-ink"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAdmin ? (
                      <CustomDatePicker
                        value={item.expectedCompletionDate}
                        onChange={(date) => onDueDateChange(item.id!, date)}
                        className={`${TABLE_DROPDOWN_STYLE} w-full font-mono tabular-nums whitespace-nowrap`}
                      />
                    ) : (
                      <span className="px-2">
                        {usDate(item.expectedCompletionDate)}
                      </span>
                    )}
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

                  <td
                    className="p-2 xl:p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
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
