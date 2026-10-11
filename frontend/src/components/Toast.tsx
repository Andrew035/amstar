import React, { useCallback, useEffect, useRef, useState } from "react";
import { SEVERITY_TEXT } from "../styles/controls";

export type ToastTone = "ok" | "warn" | "gone";

/**
 * A warning needs longer on screen than a routine confirmation, and a deletion
 * sits somewhere between: worth a second look, but it was asked for.
 */
const LIFETIME: Record<ToastTone, number> = { ok: 3400, warn: 6000, gone: 4200 };

/** Green says it happened, red says it is gone, amber says it did not happen. */
const FILL: Record<ToastTone, string> = {
  ok: "bg-amstar-notice",
  warn: "bg-amstar-alert",
  gone: "bg-amstar-removed",
};

/** Past this far up, or this fast, let go and it goes. */
const DISMISS_DISTANCE = 52;
const DISMISS_VELOCITY = 0.45; // px per ms

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * A notification at the top of the screen, flicked away like one on a phone.
 *
 * Pointer events rather than touch events, so one code path covers a finger on
 * an iPad and a mouse on the counter PC. Dragging down is rubber-banded to a
 * quarter of the distance: it gives, so it feels physical, but it will not let
 * you park the thing in the middle of the page.
 *
 * The auto-dismiss timer pauses while a finger is down. Having it vanish
 * mid-drag is the kind of small betrayal that makes an interface feel cheap.
 *
 * It is a filled bright chip rather than a dark panel because it lands ON the
 * navbar. On `raised` it measured 1.23:1 against the bar behind it, so it read
 * as part of the navbar rather than as a thing in front of it. The severity
 * tokens were better but still short: sev-5 3.64:1, sev-1 5.06:1.
 *
 * amstar-notice and amstar-alert exist for this one job and clear 7:1 on the
 * navbar with black text at ~11.5:1, so the colour does the separating and no
 * outline is needed. Both are bright, so they take SEVERITY_TEXT (black);
 * white on either is under 2:1.
 */
export const Toast: React.FC<{
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}> = ({ message, tone, onDismiss }) => {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const startY = useRef(0);
  const lastY = useRef(0);
  const lastAt = useRef(0);
  /*
   * Speed between the last two samples, smoothed. It has to be measured per
   * move: dividing the TOTAL distance by the time since the last move mixes
   * two different intervals and reports a huge number, which made even a
   * 20px nudge clear the flick threshold.
   */
  const velocity = useRef(0);
  const goneRef = useRef(false);

  const leave = useCallback(() => {
    if (goneRef.current) return;
    goneRef.current = true;
    setLeaving(true);
    // Matches the exit transition below, so the node is removed exactly as it
    // finishes rather than snapping away mid-flight.
    window.setTimeout(onDismiss, 220);
  }, [onDismiss]);

  // Auto-dismiss, held off while a finger or the mouse is on it.
  useEffect(() => {
    if (dragging || leaving) return;
    const t = window.setTimeout(leave, LIFETIME[tone]);
    return () => window.clearTimeout(t);
  }, [dragging, leaving, tone, leave]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leaving) return;
    // Throws NotFoundError if the pointer is already gone; capture is an
    // optimisation here, not a requirement.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* drag still tracks without it */
    }
    startY.current = e.clientY;
    lastY.current = e.clientY;
    lastAt.current = performance.now();
    velocity.current = 0;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const raw = e.clientY - startY.current;
    // Up is free, down resists.
    setDy(raw < 0 ? raw : raw * 0.25);

    const now = performance.now();
    const dt = now - lastAt.current;
    if (dt > 0) {
      const v = (e.clientY - lastY.current) / dt;
      // Weighted towards the newest sample, so a flick at the end of a slow
      // drag still reads as a flick, without a single jittery frame deciding.
      velocity.current = velocity.current * 0.3 + v * 0.7;
    }
    lastY.current = e.clientY;
    lastAt.current = now;
  };

  const onPointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    // Releasing capture explicitly: a captured pointer that disappears without
    // a pointerup would otherwise leave dragging stuck true, and the
    // auto-dismiss effect returns early while it is, so the toast would hang
    // around invisibly with its band still over the navbar.
    try {
      if (e && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* nothing to release */
    }
    setDragging(false);
    // A finger that stopped before lifting is not a flick, however fast it
    // was travelling a moment ago.
    const stale = performance.now() - lastAt.current > 120;
    const v = stale ? 0 : velocity.current;
    if (dy <= -DISMISS_DISTANCE || v <= -DISMISS_VELOCITY) {
      setDy(-180);
      leave();
    } else {
      setDy(0); // settle back
    }
  };

  const lifted = Math.min(0, dy);
  const opacity = leaving ? 0 : 1 - Math.min(1, Math.abs(lifted) / 150);
  // Only drive transform inline once the thing has actually been touched, so
  // the entrance keyframe is not overridden on mount.
  const moved = dragging || leaving || dy !== 0;

  return (
    /*
     * pointer-events-none on the band, auto on the chip. The band is fixed
     * across the top of the screen, directly over the navbar, so if it takes
     * pointer events it eats clicks on the nav links - and keeps eating them
     * after the chip has been dragged out of sight, because the chip moves and
     * the band does not.
     */
    <div className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[150] w-[min(92vw,26rem)] px-1">
      <div
        role="status"
        aria-live={tone === "warn" ? "assertive" : "polite"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        className={`anim-drop pointer-events-auto select-none cursor-grab active:cursor-grabbing
          rounded shadow-2xl px-5 py-3 flex items-center gap-3
          ${FILL[tone]}
          ${dragging ? "" : "transition-[transform,opacity] duration-200"}`}
        style={{
          // `none` keeps a vertical drag from being stolen by page scrolling.
          touchAction: "none",
          transitionTimingFunction: EASE,
          transform: moved ? `translateY(${dy}px)` : undefined,
          opacity: moved ? opacity : undefined,
        }}
      >
        <span className="shrink-0 w-5 h-5 rounded-full bg-black/20 grid place-items-center">
          {tone === "warn" ? (
            <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5">
              <path d="M8 4.2v4.4M8 11.4v.3" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : tone === "gone" ? (
            <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5">
              <path d="M4 8h8" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden className="w-3 h-3">
              <path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                fill="none"
                stroke="black"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className={`text-sm font-bold ${SEVERITY_TEXT}`}>{message}</span>
      </div>
    </div>
  );
};
