import type { Rgba } from "./contrast";

export type CameraBackdropName = "lampAtNight" | "daylight" | "lowLight";

export type CameraBackdrop = {
  /** Mean of the darkest 5 % of pixels. */
  dark: Rgba;
  /** Mean of the brightest 5 % of pixels. */
  bright: Rgba;
};

const rgb = (r: number, g: number, b: number): Rgba => ({ r, g, b, a: 1 });

/**
 * Photographed-paper references measured in docs/design/directions.html (paper under a warm desk
 * lamp, in daylight and in low light, with desk, vignette and sensor grain). Controls over the
 * camera must pass contrast against both extremes of each one.
 */
export const CAMERA_BACKDROPS: Record<CameraBackdropName, CameraBackdrop> = {
  lampAtNight: { dark: rgb(38, 22, 12), bright: rgb(227, 197, 158) },
  daylight: { dark: rgb(112, 118, 117), bright: rgb(212, 217, 216) },
  lowLight: { dark: rgb(14, 13, 12), bright: rgb(123, 124, 115) },
};

/**
 * How each backdrop is painted (desk, sheet, colour cast, vignette and grain), so the simulated
 * camera in the playground shows the same photos the extremes above were measured on.
 * These are photo colours, not interface colours: never use them for UI.
 */
export type CameraBackdropRecipe = {
  desk: string;
  paper: string;
  /** Colour cast of the light, multiplied over the scene. */
  tint: string;
  tintOpacity: number;
  /** Vignette centre and radius, as SVG radialGradient percentages. */
  vignette: { cx: string; cy: string; r: string; edge: string };
  /** Sensor grain strength, 0..1. */
  grain: number;
  /** Pencil of the sketch already on the sheet. */
  pencil: string;
};

export const CAMERA_BACKDROP_RECIPES: Record<CameraBackdropName, CameraBackdropRecipe> = {
  lampAtNight: {
    desk: "#2A1C12",
    paper: "#F2EAD9",
    tint: "#FFC98A",
    tintOpacity: 0.55,
    vignette: { cx: "34%", cy: "30%", r: "80%", edge: "rgba(24, 12, 2, 0.82)" },
    grain: 0.1,
    pencil: "#4A4038",
  },
  daylight: {
    desk: "#7D827F",
    paper: "#EFF1ED",
    tint: "#E1E9F0",
    tintOpacity: 0.45,
    vignette: { cx: "60%", cy: "18%", r: "120%", edge: "rgba(20, 24, 28, 0.22)" },
    grain: 0.06,
    pencil: "#5A5953",
  },
  lowLight: {
    desk: "#1A1917",
    paper: "#C9C4BA",
    tint: "#7C827E",
    tintOpacity: 0.85,
    vignette: { cx: "50%", cy: "45%", r: "95%", edge: "rgba(0, 0, 0, 0.62)" },
    grain: 0.24,
    pencil: "#3E3C38",
  },
};

/** The reference image of the demos: black line art on off-white, like a scanned drawing. */
export const DEMO_ARTWORK = { ink: "#1A1A18", paper: "#F3F0E8" } as const;

/** Extra references required by the brief: a mid-grey photo and a white sheet. */
export const REFERENCE_SURFACES = {
  midGrey: rgb(128, 128, 128),
  whitePaper: rgb(255, 255, 255),
} as const;
