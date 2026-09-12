import React, { useCallback, useEffect, useRef, useState } from 'react';
import { panelCoords } from './floating';

// Just enough to avoid flickering tooltips while the pointer crosses a row.
const SHOW_DELAY_MS = 80;

/**
 * Fast "reveal the full value" tooltip for any element whose text is clipped.
 *
 * Extracted from Truncated so it also works on an <input>, where a wrapper
 * component cannot be used. Positioned `fixed` via panelCoords so it is not
 * clipped by the `overflow-x-auto` table wrapper.
 *
 * `tapToReveal` should be false whenever the anchor sits inside something
 * clickable - otherwise the click meant for the parent gets swallowed.
 */
export function useTruncationTooltip<T extends HTMLElement>(
  text: string,
  tapToReveal = true,
) {
  const anchorRef = useRef<T | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setTip(null);
  }, []);

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    // Nothing is clipped, so nothing to reveal.
    if (el.scrollWidth <= el.clientWidth) return;

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const estimatedWidth = Math.min(320, text.length * 7 + 16);
      const { top, left } = panelCoords(rect, 32, estimatedWidth);
      setTip({ top, left });
    }, SHOW_DELAY_MS);
  }, [text]);

  // A fixed tooltip would detach from its anchor if the page scrolled under it.
  useEffect(() => {
    if (!tip) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [tip, hide]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handlers = {
    onMouseEnter: show,
    onMouseLeave: hide,
    ...(tapToReveal
      ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          if (tip) {
            hide();
          } else {
            show();
          }
        },
      }
      : {}),
  };

  const tooltip = tip ? (
    <span
      role="tooltip"
      style={{ top: tip.top, left: tip.left, maxWidth: 320 }}
      className="fixed z-[200] px-2 py-1 rounded bg-amstar-ground border border-amstar-line shadow-2xl text-amstar-ink text-xs font-mono break-all pointer-events-none"
    >
      {text}
    </span>
  ) : null;

  return { anchorRef, handlers, tooltip, hide, show };
}
