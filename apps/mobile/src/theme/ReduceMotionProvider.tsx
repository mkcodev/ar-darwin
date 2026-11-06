import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, LogBox } from "react-native";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";

type ReduceMotionState = {
  /** What animations follow: the override when set, else the system setting. */
  reduce: boolean;
  system: boolean;
  /** null follows the system. */
  override: boolean | null;
  setOverride: (override: boolean | null) => void;
};

const ReduceMotionContext = createContext<ReduceMotionState | null>(null);

// `ReducedMotionConfig` below warns once per mount in development that it overrides the setting:
// that is its whole job here, so the warning would only be noise on every start.
LogBox.ignoreLogs(["Reduced motion setting is overwritten"]);

type ReduceMotionProviderProps = {
  /** Stored override to start from (the Settings task loads it); null follows the system. */
  initial?: boolean | null;
  /** Called on every change so the caller can persist it. */
  onChange?: (override: boolean | null) => void;
  children: ReactNode;
};

/**
 * The system's «reduce motion», live (AccessibilityInfo, unlike Reanimated's
 * `useReducedMotion`, which reads it once), with an override: the one stored in Settings
 * (`AppSettingsProvider` sets it once read) or the /dev/design toggle.
 *
 * Components read `reduce` and pick their own reduced version. Any Reanimated animation that does
 * not (a bare `withTiming`, an `entering` preset) follows Reanimated's global default, which on its
 * own reads only the system, once: `ReducedMotionConfig` keeps that default equal to `reduce`, so
 * the override and a live change of the system reach those too.
 */
export function ReduceMotionProvider({ initial, onChange, children }: ReduceMotionProviderProps) {
  const [system, setSystem] = useState(false);
  const [override, setOverrideState] = useState<boolean | null>(initial ?? null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setSystem(on);
      })
      .catch(() => {
        // Unknown: keep full motion.
      });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const value = useMemo<ReduceMotionState>(
    () => ({
      reduce: override ?? system,
      system,
      override,
      setOverride: (next) => {
        setOverrideState(next);
        onChange?.(next);
      },
    }),
    [override, system, onChange],
  );

  return (
    <ReduceMotionContext.Provider value={value}>
      <ReducedMotionConfig mode={value.reduce ? ReduceMotion.Always : ReduceMotion.Never} />
      {children}
    </ReduceMotionContext.Provider>
  );
}

export function useReduceMotion(): ReduceMotionState {
  const state = useContext(ReduceMotionContext);
  if (!state) throw new Error("useReduceMotion must be used inside ReduceMotionProvider");
  return state;
}
