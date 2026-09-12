import React from "react";

/**
 * One-line text that ellipsises and reveals the full value on hover.
 *
 * Uses the native `title` attribute rather than a styled tooltip on purpose:
 * these live inside `overflow-x-auto` table cells, where an absolutely
 * positioned tooltip would be clipped by the scroll container. `title` also
 * works for keyboard and screen-reader users, and needs no z-index management.
 */
export const Truncated: React.FC<{
  value?: string | null;
  className?: string;
  fallback?: string;
}> = ({ value, className = '', fallback = '—' }) => {
  const text = value?.trim() || fallback;
  return (
    <span className={`block truncate ${className}`} title={text}>
      {text}
    </span>
  );
};
