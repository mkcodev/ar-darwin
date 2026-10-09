import { type CSSProperties, useId } from "react";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Text of the value, shown in the `value` type role with tabular figures. */
  format: (value: number) => string;
  /** Hides the visible label (it stays as the accessible name). */
  compact?: boolean;
  tone?: "theme" | "camera";
};

/** Native range input, styled; the value never jitters thanks to tabular figures. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  compact,
  tone = "theme",
}: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={`slider slider-${tone}${compact ? " slider-compact" : ""}`}>
      <label htmlFor={id} className={compact ? "visually-hidden" : "slider-label"}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
      <output htmlFor={id} className="value-text">
        {format(value)}
      </output>
    </div>
  );
}
