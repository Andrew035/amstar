import { useEffect, useState } from "react";

/**
 * True only once `active` has stayed true for `ms`.
 *
 * A skeleton that appears for 80ms and vanishes is worse than no skeleton: it
 * reads as a flicker rather than as loading. On the shop's own network the
 * queue usually lands fast enough that the right answer is to show nothing and
 * let the content appear, so the placeholder is held back until the wait is
 * long enough to be worth explaining.
 *
 * Resets on the way back down, so a later refetch gets the same grace period.
 */
export const useDelayed = (active: boolean, ms = 180): boolean => {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }
    const timer = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(timer);
  }, [active, ms]);

  return active && elapsed;
};
