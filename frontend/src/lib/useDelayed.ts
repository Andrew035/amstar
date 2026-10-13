import { useEffect, useState } from "react";

/**
 * True only once `active` has stayed true for `ms`.
 *
 * A skeleton that shows for 80ms and disappears reads as a flicker, not as
 * loading. On the shop's wifi the queue usually lands fast enough that the
 * right answer is to show nothing at all and let the content appear.
 */
export const useDelayed = (active: boolean, ms = 180): boolean => {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }
    const t = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(t);
  }, [active, ms]);
  return active && elapsed;
};
