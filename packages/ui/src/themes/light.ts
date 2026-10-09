import { graphite, ink, nonPhotoBlue, paper, signal, vermilion } from "../primitives";
import type { Theme } from "./types";

/** Paper version of «Grafito y luz»: ledger paper, iron-gall ink, the same vermilion at a darker value. */
export const lightTheme: Theme = {
  name: "light",
  color: {
    bg: {
      canvas: paper[200],
      surface: paper[100],
      raised: paper[50],
      overlay: "rgba(30, 34, 41, 0.36)",
    },
    text: {
      primary: ink[900],
      muted: paper[600],
      onAccent: vermilion.onLight,
    },
    border: {
      subtle: "rgba(30, 34, 41, 0.14)",
      strong: paper[400],
    },
    accent: {
      default: vermilion[600],
      pressed: vermilion[700],
      subtle: "rgba(201, 58, 10, 0.10)",
    },
    guide: {
      // Cuaderno de campo used #2F9FDB here: 2.4:1 on paper. 600 keeps the hue and reaches 3:1.
      default: nonPhotoBlue[600],
      tint: "rgba(31, 127, 184, 0.20)",
    },
    danger: signal.dangerOnLight,
    focus: ink[900],
    camera: {
      pill: "rgba(244, 244, 238, 0.97)",
      pillSolid: paper[100],
      // Ink edge: the paper fill alone disappears against a white sheet.
      pillEdge: ink[900],
      text: ink[900],
      muted: paper[600],
      accent: vermilion[600],
      guide: nonPhotoBlue[300],
      guideCase: graphite.case,
      guideTint: "rgba(127, 211, 247, 0.30)",
    },
  },
};
