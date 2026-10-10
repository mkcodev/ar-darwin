/**
 * Icon geometry on a 24 grid: strokes only, round caps and joins, no fills (except tiny dots).
 * Plain data so web draws it as SVG and mobile with Skia, from the same source. Each `path`
 * can be drawn as a pencil stroke (stroke-dashoffset with pathLength 1) for «trazo vivo».
 */
export type IconShape =
  | { type: "path"; d: string; dashed?: boolean }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx: number }
  | { type: "circle"; cx: number; cy: number; r: number; filled?: boolean };

export const icon = {
  grid: 24,
  size: 24,
  /** Stroke width in grid units; scales with the icon. */
  stroke: 1.75,
  /** Dash pattern of axis lines (mirror, splitter cut). */
  dash: [1.5, 2.5],
  /** «Trazo vivo»: each stroke starts drawing this long after the previous one. */
  drawStaggerMs: 60,
} as const;

const path = (d: string, dashed = false): IconShape =>
  dashed ? { type: "path", d, dashed } : { type: "path", d };

export const icons = {
  lock: [
    { type: "rect", x: 5, y: 11, width: 14, height: 9, rx: 2 },
    path("M8 11V8a4 4 0 0 1 8 0v3"),
    path("M12 15v2"),
  ],
  magnet: [path("M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0Z"), path("M5 8h4M15 8h4")],
  opacity: [
    { type: "circle", cx: 12, cy: 12, r: 8 },
    path("M12 4v16"),
    path("M12 8.5l4.6-3.2M12 12.5l7-4M12 16.5l7.4-3.4M12 20l4.4-2.3"),
  ],
  mirrorH: [path("M12 3v18", true), path("M9 7 4 17h5Z"), path("M15 7l5 10h-5Z")],
  mirrorV: [path("M3 12h18", true), path("M7 9 17 4v5Z"), path("M7 15l10 5v-5Z")],
  flash: [path("M8 3h8v4l-2 4v10h-4V11L8 7Z"), path("M8 7h8"), path("M12 14v2.5")],
  arrowUp: [path("M12 19V5M6 11l6-6 6 6")],
  arrowDown: [path("M12 5v14M6 13l6 6 6-6")],
  arrowLeft: [path("M19 12H5M11 6l-6 6 6 6")],
  arrowRight: [path("M5 12h14M13 6l6 6-6 6")],
  rotateCw: [path("M19.5 12a7.5 7.5 0 1 1-2.2-5.3"), path("M20 4v4h-4")],
  rotateCcw: [path("M4.5 12a7.5 7.5 0 1 0 2.2-5.3"), path("M4 4v4h4")],
  reset: [
    path("M4.5 12a7.5 7.5 0 1 0 2.2-5.3"),
    path("M4 4v4h4"),
    { type: "circle", cx: 12, cy: 12, r: 1.6, filled: true },
  ],
  split: [
    { type: "rect", x: 5, y: 5, width: 14, height: 14, rx: 1.5 },
    path("M12 2v20M2 12h20", true),
  ],
  nextTile: [
    { type: "rect", x: 3, y: 6, width: 9, height: 12, rx: 1.5 },
    path("M15 12h6M18 9l3 3-3 3"),
  ],
  library: [
    { type: "rect", x: 7, y: 3, width: 13, height: 15, rx: 1.5 },
    path("M4 7v12.5A1.5 1.5 0 0 0 5.5 21H16"),
    path("M10 13.5c1.6-2.6 3.4 1 5.5-2.5"),
  ],
  settings: [
    path("M4 7h9M19 7h1M4 17h3M11 17h9"),
    { type: "circle", cx: 16, cy: 7, r: 2.5 },
    { type: "circle", cx: 9, cy: 17, r: 2.5 },
  ],
  camera: [
    { type: "rect", x: 3, y: 7, width: 18, height: 13, rx: 2.5 },
    path("M8.5 7l1.5-3h4l1.5 3"),
    { type: "circle", cx: 12, cy: 13.5, r: 3.5 },
  ],
  plus: [path("M12 5v14M5 12h14")],
  minus: [path("M5 12h14")],
  image: [
    { type: "rect", x: 3, y: 5, width: 18, height: 14, rx: 2 },
    path("M4 17l5-5 4 4 2.5-2.5L20 17"),
    { type: "circle", cx: 15.5, cy: 9.5, r: 1.5 },
  ],
  trash: [
    path("M4 7h16"),
    path("M9.5 7V4.5h5V7"),
    path("M6 7l1 13h10l1-13"),
    path("M10 11v5M14 11v5"),
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof icons;

/**
 * Logo: Darwin's 1837 "I think" tree, drawn from the origin marked «1». On a 48 grid; the origin
 * dot is painted with the accent, the branches with the text colour.
 */
export const logoMark = {
  grid: 48,
  stroke: 2,
  origin: { cx: 10, cy: 42, r: 3 },
  /** The «1» Darwin wrote by the root, in the accent. Drawn first, then the branches grow. */
  numeral: "M3 34.5l2.2-1.7v8.2",
  branches: [
    "M10 42C12 34 16 28 22 24",
    "M22 24C26 18 32 13 40 9",
    "M22 24C28 24 34 26 40 30",
    "M31 15C34 17 36 20 38 22",
    "M37.5 6.5L42.5 11.5",
    "M37.5 32.5L42.5 27.5",
    "M35.5 24.5L40.5 19.5",
  ],
} as const;
