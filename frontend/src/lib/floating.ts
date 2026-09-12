/**
 * Position for a fixed floating panel anchored to 'rect'.
 *
 * Flips above the anchor when there isn't room below - otherwise a dropdown on
 * the last table row renders past the viewport and its lowest option cannot be
 * reached.
 *
 * Measures against visualViewport rather than window.innerHeight. On iOS
 * Safari innerHeight reports the layout viewport, which includes the strip
 * hidden behind the toolbars, so it overestimates the space below an anchor
 * and the panel never flips. The soft keyboard has the same effect, larger.
 * On desktop the two are identical, which is why this only showed up on iPad.
 */
export function panelCoords(rect: DOMRect, panelHeight: number, minWdith = 0) {
  const GAP = 4;
  const MARGIN = 8;

  const vv = window.visualViewport;
  const viewHeight = vv?.height ?? window.innerHeight;
  const viewWidth = vv?.width ?? window.innerWidth;
  // getBoundingClientRect is in layout-viewport coordinates; these convert
  // between that and the visible band.
  const offsetTop = vv?.offsetTop ?? 0;
  const offsetLeft = vv?.offsetLeft ?? 0;

  const width = Math.max(rect.width, minWdith);

  const spaceBelow = viewHeight - (rect.bottom - offsetTop);
  const spaceAbove = rect.top - offsetTop;
  const flipUp =
    spaceBelow < panelHeight + GAP + MARGIN && spaceAbove > spaceBelow;

  // Never taller than the visible band, so a long list stays reachable.
  const maxHeight = Math.max(120, viewHeight - 2 * MARGIN);
  const effectiveHeight = Math.min(panelHeight, maxHeight);

  const topLimit = offsetTop + MARGIN;
  const bottomLimit = offsetTop + viewHeight - MARGIN - effectiveHeight;
  const rawTop = flipUp ? rect.top - effectiveHeight - GAP : rect.bottom + GAP;
  const top = Math.max(topLimit, Math.min(rawTop, bottomLimit));

  const leftLimit = offsetLeft + MARGIN;
  const rightLimit = offsetLeft + viewWidth - width - MARGIN;
  const left = Math.max(
    leftLimit,
    Math.min(rect.left, Math.max(leftLimit, rightLimit)),
  );

  return { top, left, width, maxHeight };
}
