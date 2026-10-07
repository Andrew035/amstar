import React, { useEffect, useMemo, useState } from "react";
import { LABEL_STYLE, SHARED_INPUT_STYLE } from "../styles/controls";

const splitServices = (csv?: string | null) =>
  (csv ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

/**
 * Services for one repair ticket: a compact trigger in the table cell that
 * opens a modal listing every service in full, with add/remove for admins.
 *
 * Every click handler stops propagation. React events bubble through the
 * component tree, not the DOM, so a click anywhere inside this modal would
 * otherwise reach the table row's onClick - which opens the delete confirmation.
 */
export const ServicesCell: React.FC<{
  value?: string | null;
  historicalMap: Record<string, number>;
  onChange: (csv: string) => void;
  readOnly?: boolean;
  /**
   * Height of the closed control. A floor rather than a fixed height, and a
   * prop rather than a class on the button, so the count badge - which is
   * taller than the label's line box - can never resize the control when a
   * second service is added.
   */
  className?: string;
  /** Shown under the modal title, e.g. "2010 FORD E-250 · Kane". */
  subtitle?: string;
}> = ({
  value,
  historicalMap,
  onChange,
  readOnly = false,
  subtitle,
  className = "min-h-9",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const current = useMemo(() => splitServices(value), [value]);

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(current);
    setQuery("");
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  // Escape closes without saving.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const add = (name: string) => {
    const upper = name.trim().toUpperCase();
    // 80 matches the services.name column width.
    if (!upper || upper.length > 80 || draft.includes(upper)) return;
    setDraft([...draft, upper]);
    setQuery("");
  };

  const remove = (name: string) => setDraft(draft.filter((s) => s !== name));

  const typed = query.trim().toUpperCase();

  const suggestions = Object.keys(historicalMap)
    .filter((s) => !draft.includes(s) && s.includes(typed))
    .sort()
    .slice(0, 8);

  // Offer the typed name when it is not already in the catalog or on the ticket.
  // Without this the panel goes blank the moment you type something new, which
  // reads as "this cannot be added" - Enter was the only way in, and on an iPad
  // there is nothing to tap. Mirrors ServicePicker in RepairForm.
  const canAddTyped =
    typed.length > 0 &&
    typed.length <= 80 &&
    !(typed in historicalMap) &&
    !draft.includes(typed);

  const isDirty = draft.join(", ") !== current.join(", ");

  const save = () => {
    if (!isDirty) return close();
    onChange(draft.join(", "));
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        title=""
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded border border-transparent hover:border-amstar-line text-left text-xs font-bold text-amstar-ink uppercase transition-colors ${className}`}
      >
        <span className="truncate flex-1 min-w-0">
          {current.length ? current.join(", ") : "No services"}
        </span>
        {current.length > 1 && (
          <span className="shrink-0 min-w-5 px-1.5 py-0.5 rounded-sm bg-amstar-field border border-amstar-line text-[10px] font-mono tabular-nums text-amstar-ink-dim text-center">
            {current.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="anim-fade fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 normal-case"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="services-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col cursor-default"
          >
            <div className="flex justify-between items-start border-b border-amstar-line pb-3 mb-4">
              <div className="min-w-0">
                <h3
                  id="services-modal-title"
                  className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink"
                >
                  Services
                </h3>
                {subtitle && (
                  <p className="text-xs font-bold text-amstar-ink-dim truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="shrink-0 w-10 h-10 -mr-2 -mt-1 grid place-items-center rounded-sm text-amstar-ink-faint hover:text-amstar-ink hover:bg-amstar-surface text-2xl leading-none ml-2"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto min-h-0 space-y-4">
              <div>
                <span className={LABEL_STYLE}>
                  On this ticket ({draft.length})
                </span>
                {draft.length === 0 ? (
                  <p className="text-sm text-amstar-ink-faint py-2">
                    No services yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {draft.map((service) => (
                      <li
                        key={service}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-amstar-line bg-amstar-field"
                      >
                        <span className="text-sm font-bold text-amstar-ink uppercase break-words min-w-0">
                          {service}
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => remove(service)}
                            aria-label={`Remove ${service}`}
                            className="shrink-0 w-8 h-8 rounded-sm text-amstar-ink-faint hover:text-white hover:bg-amstar-red transition-colors text-lg leading-none"
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!readOnly && (
                <div>
                  <span className={LABEL_STYLE}>Add a service</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add(query);
                      }
                    }}
                    maxLength={80}
                    placeholder="Type a service, then Enter"
                    className={SHARED_INPUT_STYLE}
                  />
                  {canAddTyped && (
                    <button
                      type="button"
                      onClick={() => add(typed)}
                      className="mt-2 w-full min-h-10 px-3 py-2 rounded-sm border border-amstar-line bg-amstar-surface hover:border-amstar-red text-left text-xs font-bold text-amstar-red-ink uppercase transition-colors"
                    >
                      + Add &quot;{typed}&quot;
                    </button>
                  )}
                  {typed.length > 0 &&
                    !canAddTyped &&
                    suggestions.length === 0 && (
                      <p className="mt-2 text-xs text-amstar-ink-faint">
                        {draft.includes(typed)
                          ? "Already on this ticket."
                          : "No matching services."}
                      </p>
                    )}
                  {suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => add(s)}
                          className="min-h-9 px-3 py-2 rounded-sm border border-amstar-line bg-amstar-surface hover:border-amstar-red text-xs font-bold text-amstar-ink uppercase text-left transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-amstar-line pt-4 mt-4">
              {readOnly ? (
                <button
                  type="button"
                  onClick={close}
                  className="px-5 py-2 rounded-sm border border-amstar-line text-amstar-ink font-cond uppercase tracking-widest text-sm hover:bg-amstar-surface transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={close}
                    className="px-5 py-2 rounded-sm border border-amstar-line text-amstar-ink font-cond uppercase tracking-widest text-sm hover:bg-amstar-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!isDirty}
                    className="px-5 py-2 bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest text-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
