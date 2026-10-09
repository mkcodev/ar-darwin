import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

type ReduceMotionState = { reduce: boolean; setReduce: (v: boolean) => void };

const ReduceMotionContext = createContext<ReduceMotionState>({
  reduce: false,
  setReduce: () => {},
});

/**
 * Starts from the system's «reduce motion» and follows it until the user flips the switch in
 * the playground, so both variants of every animation can be checked on any device.
 */
export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduce, setReduceState] = useState(() => window.matchMedia(query).matches);
  const [overridden, setOverridden] = useState(false);

  useEffect(() => {
    if (overridden) return;
    const mql = window.matchMedia(query);
    const onChange = () => setReduceState(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [overridden]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduce);
  }, [reduce]);

  const setReduce = (v: boolean) => {
    setOverridden(true);
    setReduceState(v);
  };

  return (
    <ReduceMotionContext.Provider value={{ reduce, setReduce }}>
      {children}
    </ReduceMotionContext.Provider>
  );
}

export function useReduceMotion(): ReduceMotionState {
  return useContext(ReduceMotionContext);
}
