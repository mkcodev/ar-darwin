/**
 * Font files live in packages/ui/assets/fonts (OFL). Native names are the keys passed to
 * expo-font's useFonts; React Native picks a weight by file, not by fontWeight.
 */
export const fonts = {
  display: {
    web: "'Instrument Serif', Georgia, serif",
    native: { 400: "InstrumentSerif-Italic" },
    italic: true,
  },
  ui: {
    web: "'Geist', system-ui, sans-serif",
    native: { 400: "Geist-Regular", 500: "Geist-Medium", 600: "Geist-SemiBold" },
    italic: false,
  },
  value: {
    web: "'Geist Mono', ui-monospace, monospace",
    native: { 400: "GeistMono-Regular", 500: "GeistMono-Medium" },
    italic: false,
  },
} as const;

export type FontKey = keyof typeof fonts;
type WeightOf<K extends FontKey> = keyof (typeof fonts)[K]["native"];

type RoleOf<K extends FontKey> = {
  font: K;
  weight: WeightOf<K>;
  /** px */
  size: number;
  /** px */
  lineHeight: number;
  /** px */
  letterSpacing: number;
  /** Tabular figures so %, px and tile ids do not jitter while they change. */
  tabularNums: boolean;
};

export type TypeRole = { [K in FontKey]: RoleOf<K> }[FontKey];

export const typography = {
  display: {
    font: "display",
    weight: 400,
    size: 40,
    lineHeight: 44,
    letterSpacing: -0.4,
    tabularNums: false,
  },
  title: {
    font: "ui",
    weight: 600,
    size: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
    tabularNums: false,
  },
  body: { font: "ui", weight: 400, size: 16, lineHeight: 24, letterSpacing: 0, tabularNums: false },
  label: {
    font: "ui",
    weight: 500,
    size: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
    tabularNums: false,
  },
  value: {
    font: "value",
    weight: 400,
    size: 15,
    lineHeight: 20,
    letterSpacing: 0,
    tabularNums: true,
  },
} as const satisfies Record<string, TypeRole>;

export type TypeRoleName = keyof typeof typography;

/** React Native text style for a role. */
export function toNativeTextStyle(role: TypeRole): {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontVariant?: ["tabular-nums"];
} {
  const native: Record<number, string> = fonts[role.font].native;
  const family = native[role.weight];
  if (family === undefined) {
    throw new Error(`toNativeTextStyle: no ${role.font} file for weight ${role.weight}`);
  }
  return {
    fontFamily: family,
    fontSize: role.size,
    lineHeight: role.lineHeight,
    letterSpacing: role.letterSpacing,
    ...(role.tabularNums ? { fontVariant: ["tabular-nums"] as ["tabular-nums"] } : {}),
  };
}

/** CSS declarations for a role (React style object keys). */
export function toWebTextStyle(role: TypeRole): {
  fontFamily: string;
  fontWeight: number;
  fontStyle: "italic" | "normal";
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontVariantNumeric: "tabular-nums" | "normal";
} {
  return {
    fontFamily: fonts[role.font].web,
    fontWeight: role.weight,
    fontStyle: fonts[role.font].italic ? "italic" : "normal",
    fontSize: `${role.size}px`,
    lineHeight: `${role.lineHeight}px`,
    letterSpacing: `${role.letterSpacing}px`,
    fontVariantNumeric: role.tabularNums ? "tabular-nums" : "normal",
  };
}
