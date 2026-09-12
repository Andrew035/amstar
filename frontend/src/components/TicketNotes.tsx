import React, { useEffect, useState } from "react";

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
  isAdmin: boolean;
  onSave: (id: number, notes: string) => Promise<void>;
}> = ({ repairId, initialNotes, isAdmin, onSave }) => {
  const [text, setText] = useState(initialNotes ?? '');
  const [savedText, setSavedText] = useState(initialNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset when the modal switches to a different ticket.
  useEffect(() => {
    setText(initialNotes ?? '');
    setSavedText(initialNotes ?? '');
    setError('');
  }, [repairId, initialNotes]);

  const isDirty = text !== savedText;

  const save = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave(repairId, text);
      setSavedText(text);
    } catch (err: any) {
      setError(err?.message ?? 'Could not save notes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t border-amstar-line pt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest">
          Notes
        </span>
        <span className="font-mono text-[10px] text-amstar-ink-faint tabular-nums">
          {text.length}/{MAX_NOTES}
        </span>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, MAX_NOTES))}
        onBlur={save}
        disabled={!isAdmin}
        title={text || 'No notes recorded for this repair yet.'}
        placeholder={
          isAdmin
            ? 'Parts on order, customer conversations, anything the board used to hold...'
            : 'No notes recorded.'
        }
        className="w-full h-32 resize-none overflow-y-auto px-3 py-2 bg-amstar-field border border-amstar-line
        rounded font-mono text-xs leading-relaxed text-amstar-ink shadow-inner transition focus:outline-none
        focus:border-amstar-red focus:ring-2 focus:ring-amstar-red/40 disabled:opacity-60 disabled:cursor-not-allowed"
      />

      {error && (
        <p className="mt-2 text-xs font-bold text-amstar-red-ink">{error}</p>
      )}

      {isAdmin && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] font-bold text-amstar-ink-faint">
            {isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'Saved'}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!isDirty || isSaving}
            className="px-4 py-1.5 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest
            text-xs rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition disabled:opacity-40
            disabled:cursor-not-allowed"
          >
            Save Notes
          </button>
        </div>
      )}
    </div>
  )
}
