import { spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useId } from "react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { springPlan } from "../theme/transitions";

type SegmentedControlProps<V extends string> = {
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** Hides the visible label (it stays as the group's accessible name). */
  hideLabel?: boolean;
};

/**
 * One choice among a few (theme, hand, backdrop, «Al ras / Bordes extendidos»), built on
 * native radio buttons so arrow keys and screen readers work as expected. The selection
 * slides with `snappy`; with reduced motion it jumps.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel,
}: SegmentedControlProps<V>) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.snappy, reduce);
  const id = useId();

  return (
    <fieldset className="segmented-field">
      <legend className={hideLabel ? "visually-hidden" : "field-label"}>{label}</legend>
      <div className="segmented">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} className="segment" data-checked={selected}>
              <input
                type="radio"
                className="visually-hidden"
                name={id}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {selected && (
                <motion.span
                  layoutId={`${id}-thumb`}
                  className="segment-thumb"
                  transition={plan.mode === "full" ? plan.transition : { duration: 0 }}
                />
              )}
              <span className="segment-label">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
