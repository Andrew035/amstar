import React from "react";

/**
 * The wordmark, set rather than drawn.
 *
 * The shop's sign and business card are both a heavy slanted condensed caps
 * face. Oswald at 700 with a 10 degree skew is close enough that it reads as
 * the same mark, and because it is live text it is pin sharp at every size,
 * weighs nothing, and uses the typeface the rest of the app already uses. A
 * traced bitmap of the sign was none of those things.
 *
 * The yellow is off the business card. The card runs black letters with a red
 * outline on yellow stock; on a navy app that inverts to a red letter with a
 * yellow edge, which is also what carries the contrast: amstar-red on
 * amstar-blue is 1.8:1 on its own, and the yellow edge is 9.8:1.
 *
 * Hover belongs to the parent: wrap the call site in `group` and the whole
 * lockup leans in. On the navbar it is the one thing in the bar that is not a
 * link, so the lean is what says "brand", not "button".
 */
export const AmstarLogo: React.FC<{
  /** `nav` for the 64px bar, `page` for the login and register cards. */
  size?: "nav" | "page";
  className?: string;
}> = ({ size = "nav", className = "" }) => {
  const nav = size === "nav";
  return (
    <span
      aria-label="AM Star Transmissions"
      role="img"
      className={`inline-flex flex-col leading-none select-none
      transition-transform duration-200 ease-out group-hover:scale-[1.04]
      ${nav ? "items-start origin-left" : "items-center origin-center"} ${className}`}
    >
      {/*
        The skew sits on the word, not the wrapper, so the hover scale can
        compose with it instead of overwriting it. `logo-stroke` (index.css)
        carries the yellow edge; its width is in `em`, so it tracks whichever
        font size this is rendered at.
      */}
      <span
        className={`logo-stroke font-cond font-bold uppercase text-amstar-red
        -skew-x-[10deg] tracking-[-0.005em] leading-[0.95]
        ${nav ? "text-[26px]" : "text-[46px]"}`}
      >
        Amstar
      </span>
      {/*
        Tracked out until it measures the same as AMSTAR above it, which is how
        the sign and the card set it. The negative right margin cancels the
        trailing letter-space, so the word stays optically centred instead of
        sitting one space to the left of centre.
      */}
      <span
        className={`font-cond font-bold uppercase text-amstar-ink-faint
        group-hover:text-amstar-ink-dim transition-colors duration-200
        ${
          nav
            ? "text-[9px] tracking-[0.25em] -mr-[0.25em]"
            : "text-[13px] tracking-[0.45em] -mr-[0.45em]"
        }`}
      >
        Transmissions
      </span>
    </span>
  );
};
