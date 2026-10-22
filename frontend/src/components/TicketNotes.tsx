import React, { useEffect, useState } from "react";
import { PRIMARY_BUTTON_STYLE } from "../styles/controls";

const MAX_NOTES = 5000;

/**
 * Free-text pad for a single repair ticket.
 *
 * Fixed hieght with `overflow-y-auto` rather than an auto-growing textarea:
 * the browser keeps the caret in view natively as you type, so once the text
 * reaches the bottom the content scrolls up on its won and the pad never
 * outgrows the modal.
 */
export const TicketNotes: React.FC<{
  repairId: number;
  initialNotes?: string;
  canEdit: boolean;
  onSave: (id: number, notes: string) => Promise<void>;
  label?: string;
  saveLabel?: string;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  /** Height of the pad itself. The detail pane grows it to fill the pane. */
  textareaClass?: string;
}> = ({
  repairId,
  initialNotes,
  canEdit,
  onSave,
  label = "Notes",
  saveLabel = "Save Notes",
  placeholder = "Parts on order, customer conversations, anything the board used to hold...",
  emptyText = "No notes recorded for this repair yet.",
  className = "mt-4 border-t border-amstar-line pt-4",
  textareaClass = "h-32",
}) => {
  const [text, setText] = useState(initialNotes ?? "");
  const [savedText, setSavedText] = useState(initialNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset when the modal switches to a different ticket.
  useEffect(() => {
    setText(initialNotes ?? "");
    setSavedText(initialNotes ?? "");
    setError("");
  }, [repairId, initialNotes]);

  const isDirty = text !== savedText;

  const save = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await onSave(repairId, text);
      setSavedText(text);
    } catch (err: any) {
      setError(err?.message ?? `Could not save ${label.toLowerCase()}.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest">
          {label}
        </span>
        {/*
          Only near the ceiling. "0/5000" on an empty pad is a number nobody
          needs - 5000 characters is not a limit anyone reaches by typing - so
          the counter stays out of the way until it starts to mean something.
        */}
        {text.length > MAX_NOTES * 0.8 && (
          <span className="font-mono text-[10px] text-amstar-red-ink tabular-nums">
            {text.length}/{MAX_NOTES}
          </span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_NOTES))}
        onBlur={save}
        disabled={!canEdit}
        title={text || emptyText}
        placeholder={canEdit ? placeholder : emptyText}
        className={`w-full ${textareaClass} resize-none overflow-y-auto px-3 py-2 bg-amstar-field border border-amstar-line
        rounded font-mono text-xs leading-relaxed text-amstar-ink shadow-inner transition focus:outline-none
        focus:border-amstar-red-edge focus:ring-2 focus:ring-amstar-red-edge/40 disabled:opacity-60 disabled:cursor-not-allowed`}
      />

      {error && (
        <p className="mt-2 text-xs font-bold text-amstar-red-ink">{error}</p>
      )}

      {/*
        Grouped, not spread. `justify-between` put the state word and the
        button it describes 256px apart at the pane's full width, which read as
        two unrelated controls rather than one answer to "is this saved".
      */}
      {canEdit && (
        <div className="flex items-center justify-end gap-3 mt-2">
          <span className="text-[11px] font-bold text-amstar-ink-faint">
            {isSaving ? "Saving..." : isDirty ? "Unsaved changes" : "Saved"}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!isDirty || isSaving}
            className={`${PRIMARY_BUTTON_STYLE} px-4 py-1.5 min-h-10 text-xs`}
          >
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
};
