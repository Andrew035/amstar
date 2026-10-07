import React, { useEffect } from "react";

/**
 * The intake form's shell. The form used to sit at the top of the queue page,
 * where it owned the first third of every screen; now it opens on demand.
 *
 * The scrim is a SIBLING of the panel, never its parent. `backdrop-blur`
 * establishes a containing block for `position: fixed` descendants, and every
 * dropdown in this form positions itself fixed from a getBoundingClientRect()
 * (see `panelCoords` in lib/floating.ts). Blur an ancestor of the panel and all
 * of them silently land in the wrong place.
 */
export const NewTicketModal: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
}> = ({ onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start sm:items-center p-4 overflow-y-auto">
      <div
        className="anim-fade fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/*
        The panel fades rather than popping, for the same reason the scrim is a
        sibling: an element with a transform is also a containing block for
        fixed descendants, and this panel is full of them. `anim-fade` only
        touches opacity, so none of the form's dropdowns can land wrong.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-ticket-title"
        className="anim-fade relative my-auto w-full max-w-4xl bg-amstar-surface border border-amstar-line rounded shadow-2xl"
      >
        <div className="flex items-end justify-between gap-4 px-5 pt-5 pb-2 border-b-2 border-amstar-red">
          <h3
            id="new-ticket-title"
            className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink"
          >
            New Vehicle Intake
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 grid place-items-center w-11 h-11 border border-amstar-line rounded-sm text-amstar-ink-dim hover:text-amstar-ink hover:bg-amstar-raised transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
