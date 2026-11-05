import { logoMark } from "@ar-darwin/ui";
import { useMemo } from "react";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { type Stroke, StrokeScene } from "./StrokeScene";

type TraceIllustrationProps = { size: number };

/** The sheet of paper, then Darwin's tree (the logo) drawn over it: the image traced on a folio. */
const PAPER = "M5 2.5h38v43H5Z";

export function TraceIllustration({ size }: TraceIllustrationProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;
  const strokes = useMemo<Stroke[]>(
    () => [
      { d: PAPER, color: c.text.muted, width: 1.5 },
      { d: logoMark.numeral, color: c.accent.default, width: logoMark.stroke },
      ...logoMark.branches.map((d) => ({ d, color: c.text.primary, width: logoMark.stroke })),
    ],
    [c],
  );
  return <StrokeScene grid={logoMark.grid} size={size} strokes={strokes} reduce={reduce} />;
}
