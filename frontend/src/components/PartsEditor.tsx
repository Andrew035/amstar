import React from "react";

import type { LineItem } from "../types/repair";
import { HOVER, NUMBER_INPUT_STYLE, PRESS } from "../styles/controls";
import { CurrencyInput } from "./CurrencyInput";

const blankLine = (): LineItem => ({
  description: "",
  unitPrice: 0,
  quantity: 1,
  vendor: "",
});

const ROW_INPUT =
  "w-full min-h-11 px-3 bg-amstar-ground border border-amstar-line rounded-sm text-xs font-bold text-amstar-ink uppercase placeholder:text-amstar-ink-faint placeholder:normal-case transition-[border-color] duration-150 ease-out focus:border-amstar-red-edge focus:outline-none";

const PARTS_GRID = "grid grid-cols-[1fr_3.5rem_8rem_7rem_2.5rem] gap-1.5";

/**
 * The parts table for one ticket: description, quantity, unit price, vendor.
 *
 * <p>Controlled, so the caller owns the draft and the save. Extracted from the
 * Invoices page because the bookkeeper now enters parts from a modal on the
 * queue and the owner corrects them on the Invoices page - two call sites, one
 * table, no drift. It deliberately knows nothing about labor: labor lives on
 * PATCH /pricing, which is ADMIN-only, and this component is reachable by the
 * bookkeeper.
 */
export const PartsEditor: React.FC<{
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
}> = ({ lines, onChange }) => {
  const patchLine = (index: number, patch: Partial<LineItem>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const removeLine = (index: number) =>
    onChange(lines.filter((_, i) => i !== index));

  return (
    <>
      <span className="block font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-amstar-ink-dim">
        Parts
      </span>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {lines.length === 0 && (
          <p className="py-3 text-xs text-amstar-ink-faint">
            No parts yet. Add the first one below.
          </p>
        )}

        {lines.length > 0 && (
          <div className={`${PARTS_GRID} px-1 pb-1`}>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint">
              Part
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint text-center">
              Qty
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint text-right">
              Price
            </span>
            <span className="font-cond uppercase tracking-widest text-[9px] text-amstar-ink-faint">
              Vendor
            </span>
            <span />
          </div>
        )}

        {lines.map((line, i) => (
          /*
           * `anim-row` without a stagger: "+ Add part" slides the new line in,
           * which is feedback for something the user just did. Editing a line
           * does not remount it, so nothing re-animates while somebody types.
           */
          <div key={i} className={`anim-row ${PARTS_GRID} items-center`}>
            <input
              value={line.description}
              onChange={(e) =>
                patchLine(i, { description: e.target.value.toUpperCase() })
              }
              placeholder="FRONT BRAKE PADS"
              maxLength={200}
              aria-label={`Part ${i + 1} name`}
              className={ROW_INPUT}
            />
            <input
              type="text"
              inputMode="numeric"
              // 0 is the "empty while typing" state so the field can actually be
              // cleared; onBlur settles it back to 1.
              value={line.quantity === 0 ? "" : line.quantity}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                patchLine(i, { quantity: digits ? parseInt(digits, 10) : 0 });
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                if (!line.quantity) patchLine(i, { quantity: 1 });
              }}
              aria-label={`Part ${i + 1} quantity`}
              className={`${NUMBER_INPUT_STYLE} w-full min-h-11 text-center`}
            />
            <CurrencyInput
              value={line.unitPrice}
              onChange={(unitPrice) => patchLine(i, { unitPrice })}
              aria-label={`Part ${i + 1} price`}
              className="w-full min-h-11"
            />
            <input
              value={line.vendor ?? ""}
              onChange={(e) =>
                patchLine(i, { vendor: e.target.value.toUpperCase() })
              }
              placeholder="PA"
              maxLength={60}
              aria-label={`Part ${i + 1} vendor`}
              className={ROW_INPUT}
            />
            <button
              type="button"
              onClick={() => removeLine(i)}
              aria-label={`Remove ${line.description || `part ${i + 1}`}`}
              className={`min-h-11 w-full grid place-items-center rounded-sm text-amstar-ink-faint hover:text-white hover:bg-amstar-red ${PRESS} text-lg leading-none ${HOVER}`}
            >
              &times;
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...lines, blankLine()])}
          className={`mt-1 min-h-11 px-3 rounded-sm border border-dashed border-amstar-line text-left font-cond text-[10px] font-bold uppercase tracking-widest text-amstar-ink-dim hover:border-amstar-red hover:text-amstar-ink ${PRESS} ${HOVER}`}
        >
          + Add part
        </button>
      </div>
    </>
  );
};
