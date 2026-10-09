import { duration, signature, spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { opacityTransition, springPlan } from "../theme/transitions";

type FloatingPillProps = {
  children: ReactNode;
  /** When true the pill retreats `signature.menuRetreatPx` towards its edge and fades out. */
  retreated: boolean;
  /** Edge the pill retreats to. */
  towards: "up" | "down" | "left" | "right";
  className?: string;
  label?: string;
};

const offset = (towards: FloatingPillProps["towards"]) => {
  const d = signature.menuRetreatPx;
  if (towards === "up") return { x: 0, y: -d };
  if (towards === "down") return { x: 0, y: d };
  if (towards === "left") return { x: -d, y: 0 };
  return { x: d, y: 0 };
};

/**
 * Camera control pill: dark fill with a paper edge. It gets out of the way after
 * `signature.menuIdleMs` without touches and returns with the `gentle` spring.
 * Reduced motion: it only fades.
 */
export function FloatingPill({
  children,
  retreated,
  towards,
  className,
  label,
}: FloatingPillProps) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.gentle, reduce);
  const move = plan.mode === "full" && retreated ? offset(towards) : { x: 0, y: 0 };
  return (
    <motion.div
      className={`camera-pill${className ? ` ${className}` : ""}`}
      role={label ? "group" : undefined}
      aria-label={label}
      initial={false}
      animate={{ ...move, opacity: retreated ? 0 : 1 }}
      transition={{
        ...plan.transition,
        opacity: opacityTransition(plan, { duration: duration.medium.ms / 1000 }),
      }}
      style={{ pointerEvents: retreated ? "none" : "auto" }}
      inert={retreated}
    >
      {children}
    </motion.div>
  );
}
