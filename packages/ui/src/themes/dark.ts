import { graphite, nonPhotoBlue, paper, signal, vermilion } from "../primitives";
import { cameraColors } from "./camera";
import type { Theme } from "./types";

/** «Grafito y luz»: default theme. Graphite surfaces, paper text, vermilion action, non-photo guides. */
export const darkTheme: Theme = {
  name: "dark",
  color: {
    bg: {
      canvas: graphite[950],
      surface: graphite[900],
      raised: graphite[850],
      overlay: "rgba(8, 8, 7, 0.56)",
    },
    text: {
      primary: paper.text,
      muted: graphite[400],
      onAccent: vermilion.onDark,
    },
    border: {
      subtle: "rgba(241, 236, 225, 0.12)",
      strong: graphite[700],
    },
    accent: {
      default: vermilion[500],
      pressed: vermilion[550],
      subtle: "rgba(255, 90, 31, 0.14)",
    },
    guide: {
      default: nonPhotoBlue[300],
      tint: "rgba(127, 211, 247, 0.30)",
    },
    danger: signal.dangerOnDark,
    focus: paper.text,
    camera: cameraColors,
  },
  statusBar: { app: "light", camera: "light" },
};
