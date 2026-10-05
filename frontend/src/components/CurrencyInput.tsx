import React from "react";
import { NUMBER_INPUT_STYLE } from "../styles/controls";

// numeric(10,2) in the schema -> 99999999.99 is the largest storable value.
const MAX_DIGITS = 10;

/**
 * Cach-register entry: digits fill in from the cents position, so typing
 * 2, 4, 5, reads 0.02 -> 0.24 -> 2.45.
 *
 * The value is re-derived form every digit currently in the field rather than
 * from the keystroke, which makes backspace fall out for free (2.45 -> 0.24)
 * and means the caret position never matters.
 *
 * type="text" rather than "number": a number input strips leading zeros and
 * fights the caret during this kind of entry. inputMode="decimal" still raises
 * the numeric keypad on iPad.
 */
export const CurrencyInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  "aria-label"?: string;
  /** Appended to the input, so a table row can size it. Same escape hatch
      CustomDatePicker and ServicesCell already take. */
  className?: string;
}> = ({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  className = "",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
    onChange(digits ? parseInt(digits, 10) / 100 : 0);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      value={value.toFixed(2)}
      onChange={handleChange}
      // Start fresh on focus - the register metaphor is "key in the amount",
      // not "edit the existing one".
      onFocus={(e) => e.target.select()}
      className={`${NUMBER_INPUT_STYLE} ${className}`}
    />
  );
};
