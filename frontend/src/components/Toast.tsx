import React, { useEffect, useState } from "react";
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

/**
 * A notification in the bottom corner, out of the way of the work.
 *
 * <p>Deliberately not interactive. There is no dismiss gesture, and it takes
 * `pointer-events-none`, so it can never swallow a click on whatever sits
 * underneath it - which is exactly what the earlier top-centre version did to
 * the navbar. It owns its own lifetime and leaves on its own.
 *
 * <p>It is a filled bright chip rather than a dark panel so it reads as a thing
 * in front of the page: on `amstar-raised` it measured 1.23:1 against the
 * navbar and disappeared into it. `amstar-notice` / `alert` / `removed` all
 * clear ~7:1 with black text at ~11.5:1. Being bright, they take
 * `SEVERITY_TEXT`; white on any of them is under 2:1.
 */
export const Toast: React.FC<{
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}> = ({ message, tone, onDismiss }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), LIFETIME[tone]);
    return () => window.clearTimeout(out);
  }, [tone]);

  // Unmount when the exit transition finishes, so the node goes exactly as it
  // lands rather than snapping away mid-flight.
  //
  // It leaves downward, the way it came in, so the motion reads as one object
  // arriving and departing rather than two unrelated effects. Not the full
  // 150% of the entry: covering that distance in 200ms whips, and an exit
  // should not pull the eye toward something that is already finished. The
  // exit is also deliberately faster than the entry - slow where the user is
  // reading, quick where the system is tidying up.
  useEffect(() => {
    if (!leaving) return;
    const gone = window.setTimeout(onDismiss, 220);
    return () => window.clearTimeout(gone);
  }, [leaving, onDismiss]);

  return (
    <div
      role="status"
      aria-live={tone === "warn" ? "assertive" : "polite"}
      className={`anim-slide-up pointer-events-none fixed bottom-6 right-6 z-[150]
        flex max-w-[min(92vw,26rem)] items-center gap-3 rounded px-5 py-3 shadow-2xl
        transition-[transform,opacity] duration-200 ease-out
        ${FILL[tone]} ${leaving ? "translate-y-8 opacity-0" : ""}`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/20">
        {tone === "warn" ? (
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
            <path
              d="M8 4.2v4.4M8 11.4v.3"
              fill="none"
              stroke="black"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        ) : tone === "gone" ? (
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
            <path
              d="M4 8h8"
              fill="none"
              stroke="black"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3">
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
  );
};
