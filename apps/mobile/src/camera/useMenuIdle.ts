import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

type MenuIdle = {
  /** True after `ms` without activity: the camera menu retreats. */
  idle: boolean;
  /** Shows the menu and restarts the countdown (if nothing pauses it): for a still tap. */
  wake: () => void;
  /** Restarts the countdown while the menu is shown; does nothing while it is hidden. */
  poke: () => void;
  /** Hides the menu now (a tap on the empty screen). Does nothing while something pauses it. */
  hide: () => void;
  /** Shows the menu and stops the countdown until the next `wake` (focus lost, background). */
  reset: () => void;
};

/**
 * The camera menu's idle timer: `idle` turns true after `ms` without activity. Only `wake` brings
 * a hidden menu back (the screen calls it for a tap that stays put on the canvas) and `hide` sends
 * a shown one away at once (a tap on the empty part of the screen); any other touch `poke`s the
 * countdown, which does nothing once the menu is hidden. While `paused` (a finger on the image or
 * the slider, an arrow held, a sheet open) the countdown stops, and a pause never shows or hides
 * anything by itself: a menu that was hidden stays hidden, one that was shown starts counting
 * again when the pause ends. A screen reader being on keeps the menu shown for good: activating a
 * control with it sends no touches, so nothing would ever wake the menu. State changes only when
 * the menu hides or shows, never per frame; the timer is cleared on unmount.
 */
export function useMenuIdle(ms: number, paused: boolean): MenuIdle {
  const [idle, setIdle] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleRef = useRef(idle);
  idleRef.current = idle;
  const halted = paused || screenReader;
  const haltedRef = useRef(halted);
  haltedRef.current = halted;

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const arm = useCallback(() => {
    stop();
    if (haltedRef.current) return;
    timer.current = setTimeout(() => setIdle(true), ms);
  }, [ms, stop]);

  const wake = useCallback(() => {
    setIdle(false);
    arm();
  }, [arm]);

  const poke = useCallback(() => {
    if (!idleRef.current) arm();
  }, [arm]);

  const hide = useCallback(() => {
    if (haltedRef.current) return;
    stop();
    setIdle(true);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setIdle(false);
  }, [stop]);

  useEffect(() => {
    if (halted) stop();
    else if (!idleRef.current) arm();
    return stop;
  }, [halted, arm, stop]);

  useEffect(() => {
    if (screenReader) setIdle(false);
  }, [screenReader]);

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

  return { idle, wake, poke, hide, reset };
}
