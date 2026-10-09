import { graphite, nonPhotoBlue, paper, vermilion } from "../primitives";
import type { ColorTokens } from "./types";

/**
 * The camera is always dark, in both themes. A paper-coloured pill next to the drawing is a light
 * source: measured against the brightest paper of each photographed backdrop it is 1.44× brighter
 * under a desk lamp and 4.25× brighter in low light, while the graphite pill stays under 5 %.
 * See docs/DESIGN.md, «La cámara es siempre oscura».
 */
export const cameraColors: ColorTokens["camera"] = {
  pill: "rgba(28, 27, 24, 0.94)",
  pillSolid: graphite[880],
  // Paper edge at 46 %: keeps 3:1 against a dark desk where the graphite fill alone does not.
  pillEdge: "rgba(241, 236, 225, 0.46)",
  text: paper.text,
  muted: graphite[400],
  accent: vermilion[500],
  guide: nonPhotoBlue[300],
  guideCase: graphite.case,
  guideTint: "rgba(127, 211, 247, 0.30)",
};

/** Behind the camera while it opens: the screen fades to this before the live image appears. */
export const cameraBackdropColor = graphite[950];
