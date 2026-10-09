import type { CameraBackdropName } from "@ar-darwin/ui";
import { duration, easing, type Handedness, spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useState } from "react";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { springPlan, tweenPlan } from "../../theme/transitions";
import { CameraView } from "./CameraView";
import { LibraryScreen } from "./LibraryScreen";

type Phase = "library" | "covering" | "revealing" | "camera";

type CameraDemoProps = {
  backdrop: CameraBackdropName;
  hand: Handedness;
};

/**
 * Phone-sized stage with the library and the camera. Opening the camera never jumps from
 * paper to black: the screen first fades to graphite with the `screen` spring (no bounce),
 * then the live image appears. Reduced motion: 120 ms fades.
 */
export function CameraDemo({ backdrop, hand }: CameraDemoProps) {
  const { reduce } = useReduceMotion();
  const [phase, setPhase] = useState<Phase>("camera");
  const cover = springPlan(spring.screen, reduce);
  const reveal = tweenPlan(duration.short, easing.standard, reduce);

  const showCamera = phase === "revealing" || phase === "camera";
  const showCover = phase === "covering" || phase === "revealing";

  return (
    <div className="phone" data-phase={phase}>
      {showCamera ? (
        <CameraView backdrop={backdrop} hand={hand} onOpenLibrary={() => setPhase("library")} />
      ) : (
        <motion.div
          className="phone-screen"
          initial={phase === "library" ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={reveal.transition}
        >
          <LibraryScreen onOpenCamera={() => setPhase("covering")} />
        </motion.div>
      )}
      {showCover && (
        <motion.div
          key={phase}
          className="camera-cover"
          aria-hidden="true"
          initial={{ opacity: phase === "covering" ? 0 : 1 }}
          animate={{ opacity: phase === "covering" ? 1 : 0 }}
          transition={phase === "covering" ? cover.transition : reveal.transition}
          onAnimationComplete={() => setPhase(phase === "covering" ? "revealing" : "camera")}
        />
      )}
    </div>
  );
}
