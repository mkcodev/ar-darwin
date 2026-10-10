import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";

type ReduceMotionState = {
  /** What animations follow: the override when set, else the system setting. */
  reduce: boolean;
  system: boolean;
  /** null follows the system. */
  override: boolean | null;
  setOverride: (override: boolean | null) => void;
};

const ReduceMotionContext = createContext<ReduceMotionState | null>(null);

type ReduceMotionProviderProps = {
  /** Stored override to start from (the Settings task loads it); null follows the system. */
  initial?: boolean | null;
  /** Called on every change so the caller can persist it. */
  onChange?: (override: boolean | null) => void;
  children: ReactNode;
};

/**
 * The system's «reduce motion», live (AccessibilityInfo, unlike Reanimated's
 * `useReducedMotion`, which reads it once), with an override so /dev/design (and later
 * Settings) can check both versions of every animation without touching the system.
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

  return <ReduceMotionContext.Provider value={value}>{children}</ReduceMotionContext.Provider>;
}

export function useReduceMotion(): ReduceMotionState {
  const state = useContext(ReduceMotionContext);
  if (!state) throw new Error("useReduceMotion must be used inside ReduceMotionProvider");
  return state;
}
