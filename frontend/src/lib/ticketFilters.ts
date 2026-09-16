import type { VehicleRepair } from "../types/repair";

/**
 * Local YYYY-MM-DD, `offsetDays` from today. Deliberately not toISOString(),
 * which returns the UTC date and rolls over to tomorrow at 8pm Eastern.
 */
export const localISODate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
export const technicianList = (r: VehicleRepair): string[] =>
  (r.assignedWorker ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const invoiceTotal = (r: VehicleRepair): number =>
  (r.includeRetail ? r.retailPrice || 0 : 0) +
  (r.includeLease ? r.leasePrice || 0 : 0) +
  (r.includeLabor ? r.laborPrice || 0 : 0);

export const isActive = (r: VehicleRepair) => r.status !== "COMPLETED";

export const isOverdue = (r: VehicleRepair, today = localISODate()) =>
  isActive(r) && !!r.expectedCompletionDate && r.expectedCompletionDate < today;

export const isDueOn = (r: VehicleRepair, date: string) =>
  isActive(r) && r.expectedCompletionDate === date;

export const isUnassigned = (r: VehicleRepair) =>
  isActive(r) && technicianList(r).length === 0;

/** Finished but never priced: revenue that otherwise only shows up in History. */
export const isUnbilled = (r: VehicleRepair) =>
  r.status === "COMPLETED" && invoiceTotal(r) === 0;

/** Whole days between the due date and today (positive when late). */
export const daysLate = (r: VehicleRepair, today = localISODate()): number =>
  Math.round(
    (Date.parse(today) - Date.parse(r.expectedCompletionDate)) / 86_400_000,
  );

export const vehicleLabel = (r: VehicleRepair): string =>
  [r.vehicle?.year, r.vehicle?.make, r.vehicle?.model]
    .filter(Boolean)
    .join(" ") || "Vehicle";

export interface TicketFilter {
  label: string;
  matches: (r: VehicleRepair) => boolean;
}

/**
 * Filters addressable as `?filter=...`, so a dashboard card can link to exactly
 * the tickets it counts. Returns null for a missing or unknown value.
 */
export const parseTicketFilter = (
  param: string | null,
): TicketFilter | null => {
  if (!param) return null;
  const today = localISODate();
  const tomorrow = localISODate(1);

  if (param.startsWith("tech:")) {
    const name = param.slice("tech:".length);
    return {
      label: `Assigned to ${name}`,
      matches: (r) =>
        isActive(r) &&
        technicianList(r).some((t) => t.toLowerCase() === name.toLowerCase()),
    };
  }

  switch (param) {
    case "due-soon":
      return {
        label: "Overdue or due by tomorrow",
        matches: (r) =>
          isActive(r) &&
          !!r.expectedCompletionDate &&
          r.expectedCompletionDate <= tomorrow,
      };
    case "overdue":
      return { label: "Overdue", matches: (r) => isOverdue(r, today) };
    case "due-today":
      return { label: "Due today", matches: (r) => isDueOn(r, today) };
    case "due-tomorrow":
      return { label: "Due tomorrow", matches: (r) => isDueOn(r, tomorrow) };
    case "unassigned":
      return { label: "Unassigned", matches: isUnassigned };
    case "pending":
      return { label: "Pending", matches: (r) => r.status === "PENDING" };
    case "in-progress":
      return {
        label: "In progress",
        matches: (r) => r.status === "IN_PROGRESS",
      };
    case "unbilled":
      return { label: "Completed but not billed", matches: isUnbilled };
    default:
      return null;
  }
};
