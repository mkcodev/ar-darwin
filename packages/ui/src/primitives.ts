// Raw scales. Nothing outside packages/ui should read these: use the semantic tokens of a theme.
// Hex or rgba only, so the same strings work in React Native and CSS.

export const graphite = {
  950: "#161614",
  900: "#201F1C",
  880: "#1C1B18",
  850: "#2C2B27",
  700: "#4A4842",
  400: "#ADA799",
  /** Near-black with a cold cast, used as the dark casing of guides. */
  case: "#0E1418",
} as const;

export const paper = {
  50: "#FFFFFB",
  100: "#F4F4EE",
  200: "#E8E9E1",
  400: "#AEB0A4",
  600: "#545954",
  /** Off-white text on the dark theme. */
  text: "#F1ECE1",
} as const;

export const ink = {
  /** Iron-gall ink: text and edges of the light theme. */
  900: "#1E2229",
} as const;

export const vermilion = {
  /** Accent on graphite. White text on it is only 3.2:1, so it carries graphite text. */
  500: "#FF5A1F",
  /** Pressed on graphite. Kept light enough for graphite text (darker values drop under 4.5:1). */
  550: "#E54A12",
  /** Accent on paper: 500 is under 3:1 on paper, this keeps the hue at a darker value. */
  600: "#C93A0A",
  700: "#A82F07",
  onDark: "#170A03",
  onLight: "#FFF9F2",
} as const;

export const nonPhotoBlue = {
  /** The illustrator's sketching blue. Below 3:1 on any paper alone: always drawn with a case. */
  300: "#7FD3F7",
  /** Darker value for guides drawn on the light UI (not on the camera). */
  600: "#1F7FB8",
} as const;

export const signal = {
  dangerOnDark: "#FF8A95",
  dangerOnLight: "#A3243A",
} as const;
