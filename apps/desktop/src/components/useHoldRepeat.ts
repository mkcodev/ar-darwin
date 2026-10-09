import { useEffect, useRef } from "react";

/** Delay before a held button starts repeating, and the repeat interval. */
export const HOLD_DELAY_MS = 380;
export const HOLD_REPEAT_MS = 70;

/**
 * Runs `fn(false)` on press, then `fn(true)` every HOLD_REPEAT_MS after HOLD_DELAY_MS while
 * held. Returns handlers to spread on a button. Enter and Space give a single step.
 */
export function useHoldRepeat(fn: (repeat: boolean) => void) {
  const timers = useRef<{ delay?: number; repeat?: number }>({});
  const latest = useRef(fn);
  latest.current = fn;

  const stop = () => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
  };
  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.delay);
      window.clearInterval(t.repeat);
    };
  }, []);

  return {
    onPointerDown: () => {
      stop();
      latest.current(false);
      timers.current.delay = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(() => latest.current(true), HOLD_REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        latest.current(false);
      }
    },
  };
}
