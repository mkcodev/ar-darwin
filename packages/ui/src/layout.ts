/** Base-4 spacing scale, in px. Keys are multiples of the base unit. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Corner radii, in px. Hierarchy: controls round, clusters soft, sheets 24. */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  sheet: 24,
  /** Cluster of fine-adjust buttons: a full pill would clip its corner buttons. */
  cluster: 32,
  pill: 999,
} as const;

/**
 * Depth comes from surface contrast, not shadows. Each level names the background token it uses
 * and whether it draws a hairline border.
 */
export const elevation = {
  base: { bg: "canvas", hairline: false },
  raised: { bg: "surface", hairline: true },
  floating: { bg: "raised", hairline: true },
} as const;

export const hairline = 1;

export const zIndex = {
  base: 0,
  raised: 10,
  /** Camera menu over the image and guides. */
  chrome: 20,
  scrim: 30,
  sheet: 40,
  toast: 50,
} as const;

export const opacity = {
  disabled: 0.38,
  /** Default opacity of the overlaid image in the camera. */
  overlayImage: 0.62,
  pressedContent: 0.88,
  /** Ink of the press on neutral buttons: the text colour at this strength (web: color-mix 14 %). */
  ink: 0.14,
  /** Pressed or active fill of camera icon buttons over the pill (web: color-mix 16 %). */
  pressFill: 0.16,
} as const;

/** Minimum touch target, in px: the app is used with a pencil in the other hand. */
export const touchTarget = 48;

/** Which hand holds the pencil. Camera controls sit on the other side, under the free hand. */
export type Handedness = "right" | "left";

export const DEFAULT_HANDEDNESS: Handedness = "right";

export function controlsSide(drawingHand: Handedness): "left" | "right" {
  return drawingHand === "right" ? "left" : "right";
}
