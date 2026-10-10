import { duration, easing, type IconName, icon, icons } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { tweenPlan } from "../theme/transitions";

type IconProps = {
  name: IconName;
  size?: number;
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  label?: string;
  /**
   * «Trazo vivo»: every change of this number redraws the strokes like a pencil.
   * 0 shows the icon at rest.
   */
  drawKey?: number;
  className?: string;
};

/** The project's own icon set (packages/ui/src/icons.ts) painted as SVG strokes. */
export function Icon({ name, size = icon.size, label, drawKey = 0, className }: IconProps) {
  const { reduce } = useReduceMotion();
  const plan = tweenPlan(duration.long, easing.draw, reduce);
  const drawing = drawKey > 0;

  // Full motion draws each stroke; reduced fades the whole icon in; none shows it at once.
  const strokeInitial = drawing && plan.mode === "full" ? { pathLength: 0 } : false;
  const strokeAnimate = { pathLength: 1 };

  return (
    <motion.svg
      key={drawKey}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${icon.grid} ${icon.grid}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      initial={drawing && plan.mode === "fade" ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={plan.transition}
    >
      {icons[name].map((shape, i) => {
        const key = `${name}-${i}`;
        const delay = (i * icon.drawStaggerMs) / 1000;
        if (shape.type === "path") {
          if (shape.dashed) {
            return <path key={key} d={shape.d} strokeDasharray={icon.dash.join(" ")} />;
          }
          return (
            <motion.path
              key={key}
              d={shape.d}
              initial={strokeInitial}
              animate={strokeAnimate}
              transition={{ ...plan.transition, delay }}
            />
          );
        }
        if (shape.type === "rect") {
          return (
            <motion.rect
              key={key}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              rx={shape.rx}
              initial={strokeInitial}
              animate={strokeAnimate}
              transition={{ ...plan.transition, delay }}
            />
          );
        }
        if ("filled" in shape && shape.filled) {
          return (
            <circle
              key={key}
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              fill="currentColor"
              stroke="none"
            />
          );
        }
        return (
          <motion.circle
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            initial={strokeInitial}
            animate={strokeAnimate}
            transition={{ ...plan.transition, delay }}
          />
        );
      })}
    </motion.svg>
  );
}
