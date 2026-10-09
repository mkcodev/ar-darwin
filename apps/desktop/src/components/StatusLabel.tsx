import { duration, type IconName, signature, spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { opacityTransition, springPlan } from "../theme/transitions";
import { Icon } from "./Icon";

type StatusLabelProps = {
  icon: IconName;
  text: string;
  /** Alternates the starting tilt so stacked labels do not lean the same way. */
  tilt?: 1 | -1;
};

/**
 * Status notice (magnet on, position locked), borrowed from «Cuaderno de campo»: it lands
 * tilted like a note stuck on the page and straightens with the `playful` spring while its
 * icon draws itself. Reduced motion: `playful` has no reduced animation, so it just appears.
 * Use inside AnimatePresence to fade it out.
 */
export function StatusLabel({ icon, text, tilt = 1 }: StatusLabelProps) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.playful, reduce);
  const full = plan.mode === "full";
  const fadeOut = { duration: duration.micro.ms / 1000 };
  return (
    <motion.div
      className="status-label"
      role="status"
      initial={
        full
          ? { opacity: 0, y: -10, rotate: signature.labelTiltDeg * tilt }
          : { opacity: plan.mode === "none" ? 1 : 0 }
      }
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, transition: plan.mode === "none" ? { duration: 0 } : fadeOut }}
      transition={{ ...plan.transition, opacity: opacityTransition(plan, fadeOut) }}
    >
      <Icon name={icon} drawKey={full ? 1 : 0} size={20} />
      <span>{text}</span>
    </motion.div>
  );
}
