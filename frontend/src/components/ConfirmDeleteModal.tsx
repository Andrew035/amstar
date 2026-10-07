import React from "react";

/** Asks before a ticket is deleted for good. */
export const ConfirmDeleteModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
    <div className="anim-pop anim-fade bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-sm shadow-2xl space-y-4">
      <h3 className="font-cond text-lg font-bold uppercase tracking-wider text-amstar-red-ink flex items-center gap-2">
        ⚠️ Permanent Deletion
      </h3>
      <p className="text-sm text-amstar-ink-dim leading-relaxed">
        Are you sure you want to delete this ticket? This action removes it
        permanently from the PostgreSQL database.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => onCancel()}
          className="px-4 py-2 bg-transparent border border-amstar-line hover:bg-amstar-surface text-amstar-ink-dim rounded-sm font-cond uppercase tracking-widest text-xs transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest text-xs shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition"
        >
          Delete Ticket
        </button>
      </div>
    </div>
  </div>
);
