import { spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useId } from "react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { springPlan } from "../theme/transitions";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** On/off switch. The thumb travels with the `snappy` spring; reduced motion: it jumps. */
export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.snappy, reduce);
  const id = useId();
  return (
    <div className="toggle-row">
      <label htmlFor={id} className="toggle-label">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="toggle"
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-track" />
        <motion.span
          className="toggle-thumb"
          initial={false}
          animate={{ x: checked ? 24 : 0 }}
          transition={plan.mode === "full" ? plan.transition : { duration: 0 }}
        />
      </button>
    </div>
  );
}
