import React from "react";

/**
 * The disclosure arrow every dropdown and expandable row shares.
 *
 * <p>One direction of travel: it points right when shut and rotates a quarter
 * turn down when open. The queue used to have a caret that flipped down-to-up
 * while the Invoices and History rows turned right-to-down, which read as two
 * different controls doing the same thing.
 *
 * <p>aria-hidden because the trigger already carries aria-expanded; a screen
 * reader announcing "black right-pointing triangle" adds nothing.
 */
export const DropdownArrow: React.FC<{
  isOpen: boolean;
  className?: string;
}> = ({ isOpen, className = "" }) => (
  <span
    aria-hidden="true"
    className={`w-4 shrink-0 text-center text-xs text-amstar-ink-faint transition-transform duration-200 ease-out ${
      isOpen ? "rotate-90" : ""
    } ${className}`}
  >
    ▸
  </span>
);
