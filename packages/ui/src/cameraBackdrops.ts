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

/** Extra references required by the brief: a mid-grey photo and a white sheet. */
export const REFERENCE_SURFACES = {
  midGrey: rgb(128, 128, 128),
  whitePaper: rgb(255, 255, 255),
} as const;
