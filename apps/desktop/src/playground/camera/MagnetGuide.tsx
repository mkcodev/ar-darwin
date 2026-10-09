import { magnetGuide, signature, spring } from "@ar-darwin/ui";
import { motion } from "motion/react";
import { useReduceMotion } from "../../theme/ReduceMotion";
import { springPlan } from "../../theme/transitions";

type MagnetGuideProps = {
  orientation: "vertical" | "horizontal";
  /** Position of the line across the viewport (x for vertical, y for horizontal), px. */
  at: number;
  /** Length of the viewport along the line, px. */
  length: number;
  /** Viewport size across the line, to decide which side the ticks go. */
  across: number;
  /** Where the finger was when the image snapped, along the line: the guide grows from there. */
  contact: number;
};

type Segment = { a: number; b: number; offset0: number; offset1: number };

const pad = magnetGuide.tickMajor + magnetGuide.caseWidth;

/**
 * One magnet guide: a non-photo blue core over a near-black case (the blue alone is under 3:1
 * on paper) with measuring ticks every `tickSpacing` px, a longer one every `majorEvery`.
 * Grows from the contact point with the `snappy` spring and leaves with a 120 ms fade.
 * Reduced motion: it fades in at full length.
 */
export function MagnetGuide({ orientation, at, length, across, contact }: MagnetGuideProps) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.snappy, reduce);
  const vertical = orientation === "vertical";
  // Ticks point into the image: away from the edge the guide sits on.
  const side = at > across / 2 + 1 ? -1 : 1;
  const thickness = pad * 2;
  const line = thickness / 2;
  const clamped = Math.min(
    Math.max(at, magnetGuide.caseWidth / 2),
    across - magnetGuide.caseWidth / 2,
  );

  const ticks: Segment[] = [];
  for (let i = 0, p = 0; p <= length; i++, p += magnetGuide.tickSpacing) {
    const size = i % magnetGuide.majorEvery === 0 ? magnetGuide.tickMajor : magnetGuide.tickMinor;
    ticks.push({ a: p, b: p, offset0: line, offset1: line + side * size });
  }
  const segments: Segment[] = [{ a: 0, b: length, offset0: line, offset1: line }, ...ticks];
  const toLine = (s: Segment) =>
    vertical
      ? { x1: s.offset0, x2: s.offset1, y1: s.a, y2: s.b }
      : { x1: s.a, x2: s.b, y1: s.offset0, y2: s.offset1 };

  const box = vertical
    ? { left: clamped - line, top: 0, width: thickness, height: length }
    : { left: 0, top: clamped - line, width: length, height: thickness };
  const origin = Math.min(1, Math.max(0, contact / length));
  const grown = vertical ? { scaleY: 1 } : { scaleX: 1 };
  const seed = vertical ? { scaleY: 0 } : { scaleX: 0 };

  return (
    <motion.div
      className="magnet-guide"
      style={{
        ...box,
        originX: vertical ? 0.5 : origin,
        originY: vertical ? origin : 0.5,
      }}
      initial={
        plan.mode === "full" ? { ...seed, opacity: 1 } : { opacity: plan.mode === "none" ? 1 : 0 }
      }
      animate={{ ...grown, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: signature.guideFadeOutMs / 1000 } }}
      transition={plan.transition}
      aria-hidden="true"
    >
      <svg width={box.width} height={box.height} className="magnet-guide-svg" aria-hidden="true">
        <g className="guide-case" strokeWidth={magnetGuide.caseWidth}>
          {segments.map((s) => (
            <line key={`c${s.a}-${s.offset1}`} {...toLine(s)} />
          ))}
        </g>
        <g className="guide-core" strokeWidth={magnetGuide.coreWidth}>
          {segments.map((s) => (
            <line key={`k${s.a}-${s.offset1}`} {...toLine(s)} />
          ))}
        </g>
      </svg>
    </motion.div>
  );
}
