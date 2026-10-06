import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import { RepairForm } from "../components/RepairForm";
import { PANEL_STYLE, PRIMARY_BUTTON_STYLE } from "../styles/controls";
import { useSearchParams } from "react-router-dom";
import { matchesSearch, parseTicketFilter } from "../lib/ticketFilters";
import { FilterBanner } from "../components/FilterBanner";
import { NewTicketModal } from "../components/NewTicketModal";
import { QueueList } from "../components/QueueList";
import { TicketDetail } from "../components/TicketDetail";
import { QueueFilterDropdown } from "../components/QueueFilterDropdown";

/**
 * The shop queue, as a list beside the ticket it selects.
 *
 * This was a ten-column table until the columns stopped fitting an iPad. The
 * split view has no column widths to balance, so nothing here has to be re-cut
 * when a service name or a customer name gets long - the list carries only what
 * you scan by, and everything editable moved into the detail pane.
 *
 * Deleting is a button in that pane. It used to be a click on the row, which is
 * a sharp edge when clicking a row is also how you open it.
 */
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
  onSaveNotes: (id: number, notes: string) => Promise<void>;
  onSaveParts: (id: number, parts: string) => Promise<void>;
  onDeleteClick: (id: number) => void;
  onSaveComeback: (id: number, isComeback: boolean) => void;
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
  onSaveNotes,
  onSaveParts,
  onDeleteClick,
  onSaveComeback,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Set by the dashboard cards, e.g. /queue?filter=overdue
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketFilter = parseTicketFilter(searchParams.get("filter"));

  const activeRepairs = repairs
    .filter((r) => r.status !== "COMPLETED")
    .filter((r) => !ticketFilter || ticketFilter.matches(r))
    .filter((item) => matchesSearch(item, searchTerm))
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  // Derived rather than stored: a ticket can leave the list under you - someone
  // completes it, a filter changes, a search narrows - and the pane should fall
  // back to the top of the queue instead of going blank.
  const selected =
    activeRepairs.find((r) => r.id === selectedId) ?? activeRepairs[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && isFormOpen && (
        <NewTicketModal onClose={() => setIsFormOpen(false)}>
          <RepairForm
            onSuccess={() => {
              onRefresh();
              setIsFormOpen(false);
            }}
            onClose={() => setIsFormOpen(false)}
            currentUser={currentUser}
            isAdmin={isAdmin}
            historicalServiceMap={historicalServiceMap}
            technicianNames={technicianNames}
          />
        </NewTicketModal>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Shop Active Repairs
        </h2>
        <div className="flex items-center gap-4">
          <span className="font-mono tabular-nums text-xs text-amstar-ink-dim">
            {activeRepairs.length} active
          </span>
          <QueueFilterDropdown
            value={searchParams.get("filter") ?? ""}
            onChange={(next) => setSearchParams(next ? { filter: next } : {})}
          />
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className={`${PRIMARY_BUTTON_STYLE} shrink-0 flex items-center gap-2 px-5 min-h-11 text-sm`}
            >
              <span className="text-lg font-normal leading-none">+</span>
              Add Ticket
            </button>
          )}
        </div>
      </div>

      {ticketFilter && (
        <FilterBanner
          label={ticketFilter.label}
          count={activeRepairs.length}
          onClear={() => setSearchParams({})}
        />
      )}

      {activeRepairs.length === 0 && !searchTerm ? (
        <div
          className={`${PANEL_STYLE} border-dashed p-8 text-center text-amstar-ink-dim`}
        >
          {ticketFilter
            ? "No active repairs match this filter."
            : "No active repairs in the shop queue."}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100dvh-232px)] lg:min-h-[420px]">
          <QueueList
            repairs={activeRepairs}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            className="shrink-0 lg:w-[344px] xl:w-[380px] max-lg:h-96"
          />
          <TicketDetail
            repair={selected}
            isAdmin={isAdmin}
            technicianNames={technicianNames}
            historicalServiceMap={historicalServiceMap}
            onStatusChange={onStatusChange}
            onSeverityChange={onSeverityChange}
            onDueDateChange={onDueDateChange}
            onCustomerNameChange={onCustomerNameChange}
            onAssignWorker={onAssignWorker}
            onServiceChange={onServiceChange}
            onSaveNotes={onSaveNotes}
            onSaveParts={onSaveParts}
            onSaveComeback={onSaveComeback}
            onDeleteClick={onDeleteClick}
            className="flex-1 min-w-0 max-lg:min-h-[560px]"
          />
        </div>
      )}
    </div>
  );
};
