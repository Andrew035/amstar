import React from "react";

/** Shown above a list that was opened from a dashboard card, with a way back to everything. */
export const FilterBanner: React.FC<{
  label: string;
  count: number;
  onClear: () => void;
}> = ({ label, count, onClear }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded border border-amstar-line border-l-4 border-l-amstar-red bg-amstar-surface">
    <span className="text-sm text-amstar-ink">
      <span className="font-cond uppercase tracking-widest text-xs text-amstar-ink-dim mr-2">
        Showing
      </span>
      <span className="font-bold">{label}</span>
      <span className="text-amstar-ink-dim">
        {" "}
        · {count} {count === 1 ? "ticket" : "tickets"}
      </span>
    </span>
    <button
      type="button"
      onClick={onClear}
      className="min-h-9 px-3 py-1.5 rounded-sm border border-amstar-line text-xs font-bold text-amstar-ink uppercase tracking-wider hover:bg-amstar-raised transition-colors"
    >
      Clear filter &times;
    </button>
  </div>
);
