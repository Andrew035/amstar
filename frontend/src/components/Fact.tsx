import React from "react";

import { Truncated } from "./Truncated";

/**
 * One labelled read-only fact.
 *
 * <p>Extracted because this existed three times: once in `Pricing.tsx`, once in
 * `History.tsx` with a different value style, and six times hand-rolled inside
 * `VehicleModal`. Three spellings of the same thing is how a layout drifts.
 *
 * <p>Pass `value` for the boxed treatment, or `children` to render anything
 * else - a chip, a plate, a toggle - under the same label.
 */
export const Fact: React.FC<{
  label: string;
  value?: string | null;
  fallback?: string;
  mono?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, fallback = "N/A", mono = false, children }) => (
  <div className="min-w-0">
    <span className="mb-1 block font-cond text-[9px] uppercase tracking-widest text-amstar-ink-faint">
      {label}
    </span>
    {children ?? (
      <Truncated
        value={value || fallback}
        className={`block rounded-sm border border-amstar-line bg-amstar-field px-2 py-1 text-[11px] font-bold text-amstar-ink ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      />
    )}
  </div>
);
