import { useCallback, useEffect, useRef, useState } from "react";

/**
 * True after `ms` without activity. `wake` marks activity and restarts the countdown.
 * Paused while `paused` is true (e.g. a finger is still on the screen).
 */
export function useIdle(ms: number, paused = false): { idle: boolean; wake: () => void } {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIdle(true), ms);
  }, [ms]);

  useEffect(() => {
    if (paused) {
      window.clearTimeout(timer.current);
      setIdle(false);
      return;
    }
    wake();
    return () => window.clearTimeout(timer.current);
  }, [paused, wake]);

  return { idle, wake };
}
