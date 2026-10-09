import { useRef } from "react";
import { playHaptic } from "../theme/haptics";
import { Icon } from "./Icon";
import { useHoldRepeat } from "./useHoldRepeat";

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
};

/** − value + with long-press repeat. Hitting a limit fires the limitReached haptic once. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  format = String,
  decreaseLabel,
  increaseLabel,
}: StepperProps) {
  const latest = useRef(value);
  latest.current = value;

  const step = (delta: number) => (repeat: boolean) => {
    const next = Math.min(max, Math.max(min, latest.current + delta));
    if (next === latest.current) {
      if (!repeat) playHaptic("limitReached");
      return;
    }
    if (!repeat) playHaptic("nudgeStep");
    latest.current = next;
    onChange(next);
  };
  const down = useHoldRepeat(step(-1));
  const up = useHoldRepeat(step(1));

  return (
    <fieldset className="stepper">
      <legend className="field-label">{label}</legend>
      <div className="stepper-row">
        <button
          type="button"
          className="icon-btn icon-btn-theme"
          aria-label={decreaseLabel}
          disabled={value <= min}
          {...down}
        >
          <Icon name="minus" />
        </button>
        <output className="value-text stepper-value" aria-live="polite">
          {format(value)}
        </output>
        <button
          type="button"
          className="icon-btn icon-btn-theme"
          aria-label={increaseLabel}
          disabled={value >= max}
          {...up}
        >
          <Icon name="plus" />
        </button>
      </div>
    </fieldset>
  );
}
