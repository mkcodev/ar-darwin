/**
 * Semantic colour tokens. Both themes must provide every key: a missing token is a type error.
 * Values are hex (#RRGGBB) or rgba(r, g, b, a) strings so they work in React Native and CSS.
 */
export type ColorTokens = {
  bg: {
    canvas: string;
    surface: string;
    raised: string;
    /** Scrim behind sheets, at full strength; sheets scale its opacity with the drag. */
    overlay: string;
  };
  text: {
    primary: string;
    muted: string;
    onAccent: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  accent: {
    default: string;
    pressed: string;
    /** Background of an active icon button. */
    subtle: string;
  };
  /** Guides, grid and extended zones drawn on the app's own surfaces (splitter preview). */
  guide: {
    default: string;
    tint: string;
  };
  danger: string;
  focus: string;
  /** Controls floating over the live camera image, measured against photographed paper. */
  camera: {
    pill: string;
    pillSolid: string;
    pillEdge: string;
    text: string;
    muted: string;
    accent: string;
    guide: string;
    guideCase: string;
    guideTint: string;
  };
};

export type ThemeName = "dark" | "light";

/** Content colour of the system status bar ("light" = white icons, as expo-status-bar names it). */
export type StatusBarStyle = "light" | "dark";

export type Theme = {
  name: ThemeName;
  color: ColorTokens;
  statusBar: {
    app: StatusBarStyle;
    /** Inside the camera, always light: the camera is dark in both themes. */
    camera: "light";
  };
};
