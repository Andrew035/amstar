/**
 * True on devices with no hover capability - iPad, phones.
 *
 * Detected by pointer capability rather than viewport width on purpose: an
 * iPad in landscape is 1024px, exactly the same as a small laptop, so a
 * width breakpoint would get both cases wrong.
 *
 * Evaluated once at import. A device that gains a mouse mid-session will not
 * update, which is an acceptable trade for keeping this free of state.
 */
export const isTouchDevice =
  typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
