import React, { useState } from "react";
import { SHARED_INPUT_STYLE, HOVER } from "../styles/controls";

/**
 * A password input you can read back.
 *
 * Typing a password blind is the one place a typo costs a whole round trip -
 * worse on a shop iPad, where the on-screen keyboard makes a mistyped
 * character likelier and the field is often a code copied off a note.
 *
 * The toggle is a real button, not an icon with a click handler: it has to be
 * reachable by keyboard and announce its state, which `aria-pressed` does. It
 * is deliberately NOT inside the label, so tapping it never focuses the input
 * and pops the keyboard open on touch.
 *
 * Revealing is per-field and resets on unmount; nothing remembers that a
 * password was shown.
 */
export const PasswordField: React.FC<{
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  /** What is being revealed, for the button's label. */
  label: string;
}> = ({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required = true,
  label,
}) => {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        /* pr-12 so a long value runs under the toggle rather than behind it. */
        className={`${SHARED_INPUT_STYLE} pr-12`}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        /*
         * Do not take focus on press. The caret belongs in the field: you
         * reveal the password to check what you just typed, then keep typing.
         * Without this the button steals focus, and the ring that
         * focus-visible had correctly suppressed for a pointer appears the
         * instant the next key is pressed - the browser re-evaluates and the
         * focused element is the button.
         *
         * mousedown rather than click, because focus moves on mousedown. The
         * click still fires, and a keyboard user can still Tab here and get a
         * real focus ring, which is the one time it should be visible.
         */
        onMouseDown={(e) => e.preventDefault()}
        aria-pressed={shown}
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        /*
         * No PRESS. The nudge is for controls with a surface of their own; on
         * a borderless glyph sitting inside a field it just makes the eye
         * twitch downward, which is the same reason the ServicesCell trigger
         * is exempt.
         *
         * focus-visible, not focus: a plain `focus:` ring fires on a mouse
         * click too, so every tap on the eye left a highlighted box around it.
         * Keyboard users still get the ring.
         */
        className={`absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center
          w-10 h-10 rounded-sm text-amstar-ink-faint hover:text-amstar-ink ${HOVER}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amstar-red-edge/40`}
      >
        {/*
          The slash means "you cannot read this". It is on by default, because
          the password starts hidden, and clicking clears it to show the value
          - the slash tracks the state of the field, not the state of the
          button.
        */}
        <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
          <path
            d="M1.5 10S4.8 4.5 10 4.5 18.5 10 18.5 10 15.2 15.5 10 15.5 1.5 10 1.5 10Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="10"
            cy="10"
            r="2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          {!shown && (
            <path
              d="M3.5 16.5 16.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
};
