import { holdRepeat } from "@ar-darwin/ui";
import { useEffect, useRef } from "react";

/**
 * Runs `fn(false)` on press, then `fn(true)` every `holdRepeat.everyMs` after
 * `holdRepeat.delayMs` while held (as apps/desktop's useHoldRepeat). Returns handlers for an
 * `IconButton`. Timers run on the JS thread a few times a second, never per frame.
 *
 * Screen readers activate a button with a click and no press-in, so `onPress` also steps once —
 * unless a touch already stepped on press-in. `fn` returns false to stop repeating (a limit was
 * reached and the button got disabled under the finger, so no press-out may ever come).
 */
export function useHoldRepeat(fn: (repeat: boolean) => boolean) {
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});
  const steppedOnPressIn = useRef(false);
  const latest = useRef(fn);
  latest.current = fn;

  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
  };
  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.delay);
      clearInterval(t.repeat);
    };
  }, []);

  return {
    onPressIn: () => {
      stop();
      steppedOnPressIn.current = true;
      latest.current(false);
      timers.current.delay = setTimeout(() => {
        timers.current.repeat = setInterval(() => {
          if (!latest.current(true)) stop();
        }, holdRepeat.everyMs);
      }, holdRepeat.delayMs);
    },
    onPressOut: stop,
    onPress: () => {
      if (steppedOnPressIn.current) {
        steppedOnPressIn.current = false;
        return;
      }
      latest.current(false);
    },
  };
}
