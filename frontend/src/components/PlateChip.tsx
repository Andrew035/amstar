import React from "react";
import type { Vehicle } from "../types/repair";

/**
 * The plate, rendered one way everywhere. Four pages had four versions of this
 * before, differing in background, fallback casing and whether the state showed
 * at all.
 */
export const PlateChip: React.FC<{
  vehicle?: Vehicle;
  className?: string;
}> = ({ vehicle, className = "" }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-sm border border-amstar-line bg-amstar-raised font-mono tabular-nums text-xs font-bold text-amstar-ink ${className}`}
  >
    {vehicle?.licensePlate || "No plate"}
    {vehicle?.state ? ` \u00b7 ${vehicle.state}` : ""}
  </span>
);
