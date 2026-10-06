import type { VehicleRepair } from "../types/repair";
import {
  isActive,
  isComeback,
  isOverdue,
  isUnassigned,
  isUnbilled,
  localISODate,
  technicianList,
} from "./ticketFilters";

/** Whole days between two ISO dates. Both ends are UTC midnight, so this is exact. */
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** "2026-10" for the month an ISO date falls in. */
const monthKey = (iso: string): string => iso.slice(0, 7);

export type ShopVitals = {
  activeCount: number;
  overdueCount: number;
  onTimeRate: number | null;
  avgDaysInShop: number | null;
  comebackRate: number | null;
};

/**
 * The five headline numbers. Rates return null rather than 0 when there is
 * nothing to divide by, so the tile can say "no data" instead of claiming 0%.
 */
export const shopVitals = (
  repairs: VehicleRepair[],
  today = localISODate(),
): ShopVitals => {
  const active = repairs.filter(isActive);
  const closed = repairs.filter(
    (r) => r.status === "COMPLETED" && r.actualCompletionDate && r.entryDate,
  );

  const onTime = closed.filter(
    (r) => r.actualCompletionDate! <= r.expectedCompletionDate,
  ).length;

  const totalDays = closed.reduce(
    (sum, r) => sum + daysBetween(r.entryDate, r.actualCompletionDate!),
    0,
  );

  return {
    activeCount: active.length,
    overdueCount: repairs.filter((r) => isOverdue(r, today)).length,
    onTimeRate: closed.length ? (onTime / closed.length) * 100 : null,
    avgDaysInShop: closed.length ? totalDays / closed.length : null,
    comebackRate: repairs.length
      ? (repairs.filter(isComeback).length / repairs.length) * 100
      : null,
  };
};

export type CapacityRow = {
  name: string;
  isUnassignedBucket: boolean;
  severities: number[];
  openCount: number;
  oldestDays: number | null;
};

/**
 * Who is carrying what, with unassigned work as its own row. Sorted busiest
 * first; idle technicians fall to the bottom with their names still listed,
 * because "nobody is free" and "three people are free" are different answers
 * to the question this panel exists for.
 */
export const capacityRows = (
  repairs: VehicleRepair[],
  technicianNames: string[],
  today = localISODate(),
): CapacityRow[] => {
  const active = repairs.filter(isActive);

  const toRow = (
    name: string,
    mine: VehicleRepair[],
    isUnassignedBucket = false,
  ): CapacityRow => ({
    name,
    isUnassignedBucket,
    severities: mine
      .map((r) => r.severity)
      .sort((a, b) => b - a)
      .slice(0, 6),
    openCount: mine.length,
    oldestDays: mine.length
      ? Math.max(...mine.map((r) => daysBetween(r.entryDate, today)))
      : null,
  });

  const people = technicianNames
    .map((name) =>
      toRow(
        name,
        active.filter((r) =>
          technicianList(r).some((t) => t.toLowerCase() === name.toLowerCase()),
        ),
      ),
    )
    .sort((a, b) => b.openCount - a.openCount || a.name.localeCompare(b.name));

  const orphans = active.filter(isUnassigned);
  // Unassigned leads: it is the only row that represents a problem rather
  // than a state, and burying it under nine names is how it stays unfixed.
  return orphans.length
    ? [toRow("Unassigned", orphans, true), ...people]
    : people;
};

export type TargetRow = {
  label: string;
  pct: number;
  target: string;
  meeting: boolean;
  filter: string;
};

/**
 * Each efficiency measure against the number it should be. A bare percentage
 * is not actionable; 29% against "under 10%" is.
 */
export const targetRows = (
  repairs: VehicleRepair[],
  today = localISODate(),
): TargetRow[] => {
  const active = repairs.filter(isActive);
  const closed = repairs.filter(
    (r) => r.status === "COMPLETED" && r.actualCompletionDate,
  );
  const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);

  const unassignedPct = pct(active.filter(isUnassigned).length, active.length);
  const overduePct = pct(
    active.filter((r) => isOverdue(r, today)).length,
    active.length,
  );
  const onTimePct = pct(
    closed.filter((r) => r.actualCompletionDate! <= r.expectedCompletionDate)
      .length,
    closed.length,
  );
  const comebackPct = pct(repairs.filter(isComeback).length, repairs.length);
  const unbilledPct = pct(repairs.filter(isUnbilled).length, closed.length);

  return [
    {
      label: "Unassigned",
      pct: unassignedPct,
      target: "<10%",
      meeting: unassignedPct < 10,
      filter: "unassigned",
    },
    {
      label: "Overdue",
      pct: overduePct,
      target: "<15%",
      meeting: overduePct < 15,
      filter: "overdue",
    },
    {
      label: "On time",
      pct: onTimePct,
      target: ">85%",
      meeting: onTimePct > 85,
      filter: "",
    },
    {
      label: "Comebacks",
      pct: comebackPct,
      target: "<5%",
      meeting: comebackPct < 5,
      filter: "comeback",
    },
    {
      label: "Not billed",
      pct: unbilledPct,
      target: "0%",
      meeting: unbilledPct === 0,
      filter: "unbilled",
    },
  ];
};

export type Throughput = {
  months: Array<{ key: string; label: string; count: number }>;
  thisMonthLabel: string;
  thisMonthCount: number;
  stillOpen: number;
  bestMonth: { label: string; count: number } | null;
  average: number | null;
  /** Bars until a line can mean something. See the note in throughput(). */
  chart: "line" | "bars" | "none";
};

/**
 * Completed per month, complete months only. A partial month plots low and
 * reads as a collapse, so the current month is excluded from the line and
 * reported separately.
 */
export const throughput = (
  repairs: VehicleRepair[],
  monthsBack = 5,
  now = new Date(),
): Throughput => {
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const counts = new Map<string, number>();
  repairs.forEach((r) => {
    if (r.status !== "COMPLETED" || !r.actualCompletionDate) return;
    const key = monthKey(r.actualCompletionDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const months: Throughput["months"] = [];
  for (let back = monthsBack; back >= 1; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleString("en-US", { month: "short" }),
      count: counts.get(key) ?? 0,
    });
  }

  // Drop leading empty months: a flat run of zeros before the shop started
  // using the app is not history, it just squashes the real values.
  const firstWithData = months.findIndex((m) => m.count > 0);
  const plotted = firstWithData === -1 ? [] : months.slice(firstWithData);

  const best = plotted.length
    ? plotted.reduce((a, b) => (b.count > a.count ? b : a))
    : null;

  return {
    months: plotted,
    thisMonthLabel: now.toLocaleString("en-US", { month: "short" }),
    thisMonthCount: counts.get(currentKey) ?? 0,
    stillOpen: repairs.filter(isActive).length,
    bestMonth: best ? { label: best.label, count: best.count } : null,
    average: plotted.length
      ? plotted.reduce((s, m) => s + m.count, 0) / plotted.length
      : null,
    // A line between two points draws a slope that is not in the data. Bars
    // state each month on its own, so they are honest from the first one.
    chart: plotted.length >= 3 ? "line" : plotted.length >= 1 ? "bars" : "none",
  };
};
