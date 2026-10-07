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

/** 2026-10-05 -> 10/05/2026. Anything that is not a plain ISO date is left alone. */
export const usDate = (iso?: string | null): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "2026-09-19" -> "September 2026".
 *
 * Splits the string rather than parsing it: a bare ISO date is UTC midnight, so
 * `new Date()` renders it as the previous day anywhere west of Greenwich - and
 * on the 1st of a month that files a ticket under the wrong heading.
 */
export const monthLabel = (iso?: string | null): string => {
  if (!iso) return "Undated";
  const [year, month] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : "Undated";
};

/** Money, rendered one way everywhere. Grouped, two decimals, zero is still a number. */
export const money = (n?: number | null): string =>
  `$${(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Every way someone might type a ticket's dates: the ISO form, the US form with
 * and without leading zeros, and the month by name. Covers all three dates a
 * ticket carries, so one box answers "september", "2026" and "9/19/2026".
 */
const dateTerms = (r: VehicleRepair): string => {
  const forms: string[] = [];
  for (const iso of [
    r.entryDate,
    r.expectedCompletionDate,
    r.actualCompletionDate,
  ]) {
    if (!iso) continue;
    const us = usDate(iso);
    forms.push(iso, us, us.replace(/\b0/g, ""), monthLabel(iso));
  }
  return forms.join(" ").toLowerCase();
};

/**
 * The search behind every ticket list. Lived inline and identically in the
 * queue, pricing and history pages until the date terms were added and the
 * three copies started to drift.
 */
export const matchesSearch = (r: VehicleRepair, term: string): boolean => {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    !!r.customerName?.toLowerCase().includes(q) ||
    !!r.vehicle?.licensePlate?.toLowerCase().includes(q) ||
    !!r.vehicle?.vin?.toLowerCase().includes(q) ||
    !!r.vehicle?.make?.toLowerCase().includes(q) ||
    !!r.vehicle?.model?.toLowerCase().includes(q) ||
    !!r.assignedWorker?.toLowerCase().includes(q) ||
    !!r.serviceType?.toLowerCase().includes(q) ||
    dateTerms(r).includes(q)
  );
};

export const technicianList = (r: VehicleRepair): string[] =>
  (r.assignedWorker ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const partsSubtotal = (r: VehicleRepair): number =>
  (r.lineItems ?? []).reduce(
    (sum, li) => sum + (li.unitPrice || 0) * (li.quantity || 0),
    0,
  );

/**
 * Line items are the invoice. Tickets written before them fall back to the old
 * include-flag sum, so no historic total changes. Mirrors
 * VehicleRepair.getInvoiceTotal on the backend - keep the two in step.
 */
export const invoiceTotal = (r: VehicleRepair): number =>
  (r.lineItems?.length ?? 0) > 0
    ? partsSubtotal(r) + (r.laborPrice || 0)
    : (r.includeRetail ? r.retailPrice || 0 : 0) +
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

/**
 * A comeback: a car the shop says it has seen before. Deliberately not derived
 * from ticket count - the shop assigns this, and a flag that a derived rule can
 * override is a flag that appears broken when you switch it off.
 */
export const isComeback = (r: VehicleRepair): boolean =>
  r.vehicle?.isComeback === true;

/** Whole days between the due date and today (positive when late). */
export const daysLate = (r: VehicleRepair, today = localISODate()): number =>
  Math.round(
    (Date.parse(today) - Date.parse(r.expectedCompletionDate)) / 86_400_000,
  );

/**
 * How long the car has been with us, in whole days. Same date arithmetic as
 * `daysLate`: both ends are UTC midnight, so there is no partial-day drift.
 */
export const daysInShop = (
  r: VehicleRepair,
  today = localISODate(),
): number | null =>
  r.entryDate
    ? Math.max(
        0,
        Math.round((Date.parse(today) - Date.parse(r.entryDate)) / 86_400_000),
      )
    : null;

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
    case "comeback":
      return { label: "Comebacks", matches: isComeback };
    case "critical":
      return {
        label: "Critical pending (level 4-5)",
        matches: (r) => r.status === "PENDING" && r.severity >= 4,
      };
    default:
      return null;
  }
};
