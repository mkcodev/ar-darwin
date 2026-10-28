import { useMemo } from "react";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { type Stroke, StrokeScene } from "./StrokeScene";

type SplitIllustrationProps = { size: number };

const GRID = 48;

/**
 * A 3 × 3 split on the 48 grid: the cuts in the non-photo blue, the tile being traced (A1) in the
 * accent and two tiles with a check, as the camera marks the ones done.
 */
export function SplitIllustration({ size }: SplitIllustrationProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;
  const strokes = useMemo<Stroke[]>(
    () => [
      { d: "M6 6h36v36H6Z", color: c.guide.default, width: 1.5 },
      { d: "M18 6v36", color: c.guide.default, width: 1.5 },
      { d: "M30 6v36", color: c.guide.default, width: 1.5 },
      { d: "M6 18h36", color: c.guide.default, width: 1.5 },
      { d: "M6 30h36", color: c.guide.default, width: 1.5 },
      { d: "M6 6h12v12H6Z", color: c.accent.default, width: 2.5 },
      { d: "M20.5 12.5l2.5 2.5 4.5-5", color: c.text.primary, width: 2 },
      { d: "M32.5 24.5l2.5 2.5 4.5-5", color: c.text.primary, width: 2 },
    ],
    [c],
  );
  return <StrokeScene grid={GRID} size={size} strokes={strokes} reduce={reduce} />;
}
