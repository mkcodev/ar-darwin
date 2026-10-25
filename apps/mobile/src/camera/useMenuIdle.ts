import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

type MenuIdle = {
  /** True after `ms` without activity: the camera menu retreats. */
  idle: boolean;
  /** Marks activity: the menu is shown and the countdown restarts (if nothing pauses it). */
  wake: () => void;
  /** Shows the menu and stops the countdown until the next `wake` (focus lost, background). */
  reset: () => void;
};

/**
 * The camera menu's idle timer: `idle` turns true after `ms` without a `wake`. While `paused`
 * (a finger on the image or the slider, a sheet or the fine-adjust pad open) the menu stays shown
 * and the countdown starts over when the pause ends. A screen reader being on pauses it for good:
 * activating a control with it sends no touches, so nothing would ever wake the menu. State changes
 * only when the menu hides or shows, never per frame; the timer is cleared on unmount.
 */
export function useMenuIdle(ms: number, paused: boolean): MenuIdle {
  const [idle, setIdle] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const halted = paused || screenReader;
  const haltedRef = useRef(halted);
  haltedRef.current = halted;

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const wake = useCallback(() => {
    stop();
    setIdle(false);
    if (haltedRef.current) return;
    timer.current = setTimeout(() => setIdle(true), ms);
  }, [ms, stop]);

  const reset = useCallback(() => {
    stop();
    setIdle(false);
  }, [stop]);

  useEffect(() => {
    if (halted) reset();
    else wake();
    return stop;
  }, [halted, wake, reset, stop]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (alive) setScreenReader(on);
    });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return { idle, wake, reset };
}
