import { controlsSide, DEFAULT_HANDEDNESS, type Handedness } from "@ar-darwin/ui";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type HandednessState = {
  /** Hand holding the pencil. */
  hand: Handedness;
  setHand: (hand: Handedness) => void;
  /** Side the camera controls sit on: under the free hand. */
  controls: "left" | "right";
};

const HandednessContext = createContext<HandednessState | null>(null);

type HandednessProviderProps = {
  /** Stored hand to start from (the Settings task loads it); defaults to DEFAULT_HANDEDNESS. */
  initial?: Handedness;
  /** Called on every change so the caller can persist it. */
  onChange?: (hand: Handedness) => void;
  children: ReactNode;
};

export function HandednessProvider({ initial, onChange, children }: HandednessProviderProps) {
  const [hand, setHandState] = useState<Handedness>(initial ?? DEFAULT_HANDEDNESS);

  const value = useMemo<HandednessState>(
    () => ({
      hand,
      controls: controlsSide(hand),
      setHand: (next) => {
        setHandState(next);
        onChange?.(next);
      },
    }),
    [hand, onChange],
  );

  return <HandednessContext.Provider value={value}>{children}</HandednessContext.Provider>;
}

export function useHandedness(): HandednessState {
  const state = useContext(HandednessContext);
  if (!state) throw new Error("useHandedness must be used inside HandednessProvider");
  return state;
}
