import React from "react";

import type { VehicleRepair } from "../types/repair";
import {
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  PRIMARY_BUTTON_STYLE,
  getSeverityColor,
  SEVERITY_TEXT,
} from "../styles/controls";
import {
  invoiceTotal,
  isReadyForInvoice,
  money,
  technicianList,
  usDate,
  vehicleLabel,
} from "../lib/ticketFilters";
import { PlateChip } from "./PlateChip";

/**
 * Every car the shop has marked ready for invoice, with the detail needed to
 * write the invoice already on the row.
 *
 * The detail is inline rather than behind a click on purpose. The problem being
 * solved is "she would have to go to pricing to know what's the details and what
 * I charge for labor" - a row that needs a second click to be useful rebuilds
 * the hop this page exists to remove.
 */
export const InvoiceWorklist: React.FC<{
  repairs: VehicleRepair[];
  onMarkInvoiced: (id: number) => void;
}> = ({ repairs, onMarkInvoiced }) => {
  const ready = repairs.filter(isReadyForInvoice);

  return (
    <div className={PANEL_STYLE}>
      <h2 className={PANEL_HEADING_STYLE}>
        Ready for invoice
        {ready.length > 0 && (
          <span className="ml-2 font-mono text-amstar-red-ink">
            {ready.length}
          </span>
        )}
      </h2>

      {ready.length === 0 ? (
        <p className="px-4 py-6 text-sm font-medium text-amstar-ink-faint">
          Nothing waiting. Cars appear here when the shop marks them ready.
        </p>
      ) : (
        <ul className="divide-y divide-amstar-line-soft">
          {ready.map((repair, index) => {
            const total = invoiceTotal(repair);
            const technicians = technicianList(repair);
            const unpriced = total === 0;

            return (
              <li
                key={repair.id}
                className="anim-row px-4 py-4"
                style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <PlateChip vehicle={repair.vehicle} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="font-cond text-lg font-black uppercase tracking-wide text-amstar-ink">
                        {vehicleLabel(repair)}
                      </p>
                      <p className="truncate text-sm font-medium text-amstar-ink-dim">
                        {repair.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-mono text-xl font-bold tabular-nums ${
                        unpriced ? "text-amstar-red-ink" : "text-amstar-ink"
                      }`}
                    >
                      {money(total)}
                    </p>
                    <p className="font-cond text-[11px] uppercase tracking-widest text-amstar-ink-faint">
                      Invoice total
                    </p>
                  </div>
                </div>

                {unpriced && (
                  <p className="mt-2 text-sm font-medium text-amstar-red-ink">
                    No pricing entered yet. Check with the shop before
                    invoicing.
                  </p>
                )}

                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="font-cond text-[11px] uppercase tracking-widest text-amstar-ink-faint">
                      Labor
                    </dt>
                    <dd className="font-mono tabular-nums text-amstar-ink">
                      {money(repair.laborPrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-cond text-[11px] uppercase tracking-widest text-amstar-ink-faint">
                      Billing
                    </dt>
                    <dd className="text-amstar-ink">
                      {repair.billingType ?? "RETAIL"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-cond text-[11px] uppercase tracking-widest text-amstar-ink-faint">
                      In
                    </dt>
                    <dd className="text-amstar-ink">
                      {usDate(repair.entryDate)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-cond text-[11px] uppercase tracking-widest text-amstar-ink-faint">
                      Tech
                    </dt>
                    <dd className="truncate text-amstar-ink">
                      {technicians.join(", ") || "-"}
                    </dd>
                  </div>
                </dl>

                {(repair.lineItems?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1">
                    {repair.lineItems!.map((line, i) => (
                      <li
                        key={line.id ?? i}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-amstar-ink-dim">
                          {line.quantity} &times; {line.description}
                          {line.vendor ? ` (${line.vendor})` : ""}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-amstar-ink">
                          {money((line.unitPrice || 0) * (line.quantity || 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {repair.notes && (
                  <p className="mt-3 whitespace-pre-wrap rounded-sm border border-amstar-line-soft bg-amstar-field px-3 py-2 text-sm text-amstar-ink-dim">
                    {repair.notes}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={`rounded-sm px-2 py-1 font-cond text-[11px] uppercase tracking-widest ${getSeverityColor(
                      repair.severity,
                    )} ${SEVERITY_TEXT}`}
                  >
                    Sev {repair.severity}
                  </span>
                  <button
                    onClick={() => repair.id && onMarkInvoiced(repair.id)}
                    className={`min-h-11 px-5 text-xs ${PRIMARY_BUTTON_STYLE}`}
                  >
                    Invoice completed
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
