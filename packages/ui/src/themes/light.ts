import { ink, nonPhotoBlue, paper, signal, vermilion } from "../primitives";
import { cameraColors } from "./camera";
import { categoryPalette } from "./category";
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
    category: categoryPalette("onLight"),
    danger: signal.dangerOnLight,
    focus: ink[900],
    // Always dark: a paper pill would glare next to the drawing (see camera.ts).
    camera: cameraColors,
  },
  statusBar: { app: "dark", camera: "light" },
};
