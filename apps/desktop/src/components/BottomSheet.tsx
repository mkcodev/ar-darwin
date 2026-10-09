import { bottomSheet, spring } from "@ar-darwin/ui";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReduceMotion } from "../theme/ReduceMotion";
import { springPlan } from "../theme/transitions";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hint read by screen readers about the drag handle. */
  handleLabel: string;
  children: ReactNode;
};

/**
 * Bottom sheet with 24 px corners. Opens and closes with the `sheet` spring and follows the
 * finger when dragged down; the scrim fades in proportion to how far the sheet is open.
 * Releasing past `closeThreshold` of its height, or faster than `closeVelocity`, closes it.
 * Reduced motion: sheet and scrim fade together, dragging still works.
 */
export function BottomSheet(props: BottomSheetProps) {
  return <AnimatePresence>{props.open && <SheetBody {...props} />}</AnimatePresence>;
}

function SheetBody({ onClose, title, handleLabel, children }: BottomSheetProps) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.sheet, reduce);
  const full = plan.mode === "full";
  const panel = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(() => window.innerHeight);
  const y = useMotionValue(full ? window.innerHeight : 0);
  const scrim = useTransform(y, (v) => Math.max(0, Math.min(1, 1 - v / height)));

  // Opening runs once per mount, with the plan of that moment.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only animation
  useLayoutEffect(() => {
    const h = panel.current?.offsetHeight ?? window.innerHeight;
    setHeight(h);
    if (full) {
      y.set(h);
      animate(y, 0, plan.transition);
    }
  }, []);

  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);

  return (
    <div className="sheet-root">
      <motion.div
        className="sheet-scrim"
        style={{ opacity: full ? scrim : undefined }}
        initial={full ? false : { opacity: 0 }}
        animate={full ? undefined : { opacity: 1 }}
        exit={full ? undefined : { opacity: 0 }}
        transition={plan.transition}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.04, bottom: 1 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (
            info.offset.y > height * bottomSheet.closeThreshold ||
            info.velocity.y > bottomSheet.closeVelocity
          ) {
            onClose();
          } else {
            animate(y, 0, full ? plan.transition : { duration: 0 });
          }
        }}
        initial={full ? false : { opacity: 0 }}
        animate={full ? undefined : { opacity: 1 }}
        exit={full ? { y: height } : { opacity: 0 }}
        transition={plan.transition}
      >
        <div className="sheet-handle" role="presentation" title={handleLabel} />
        <h3 className="sheet-title">{title}</h3>
        {children}
      </motion.div>
    </div>
  );
}
