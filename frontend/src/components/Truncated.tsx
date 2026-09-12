import React from 'react';
import { useTruncationTooltip } from '../lib/useTruncationTooltip';

/**
 * One-line text that ellipsises and reveals the full value on hover.
 *
 * Set `tapToReveal={false}` when this sits inside something clickable, so the
 * click reaches the parent instead of toggling the tooltip.
 */
export const Truncated: React.FC<{
  value?: string | null;
  className?: string;
  fallback?: string;
  tapToReveal?: boolean;
}> = ({ value, className = '', fallback = '—', tapToReveal = true }) => {
  const text = value?.trim() || fallback;
  const { anchorRef, handlers, tooltip } = useTruncationTooltip<HTMLSpanElement>(
    text,
    tapToReveal,
  );

  return (
    <>
      <span ref={anchorRef} className={`block truncate ${className}`} {...handlers}>
        {text}
      </span>
      {tooltip}
    </>
  );
};
