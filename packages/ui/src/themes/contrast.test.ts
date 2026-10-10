import { describe, expect, it } from "vitest";
import { CAMERA_BACKDROPS, REFERENCE_SURFACES } from "../cameraBackdrops";
import {
  CATEGORY_COLOR_KEYS,
  type CategoryColorKey,
  MIN_CATEGORY_DELTA_E,
} from "../categoryColors";
import { blendOver, contrastRatio, deltaEOk, MIN_CONTRAST, type Rgba } from "../contrast";
import { themes } from "./index";
import type { ColorTokens } from "./types";

type Check = {
  fg: (c: ColorTokens) => string;
  bg: (c: ColorTokens) => string | Rgba;
  min: number;
  what: string;
};

const { text, nonText } = MIN_CONTRAST;

/** Every foreground on every background where the app actually uses it. */
const UI_CHECKS: Check[] = [
  ...(["canvas", "surface", "raised"] as const).flatMap((bg): Check[] => [
    { what: `text.primary on bg.${bg}`, fg: (c) => c.text.primary, bg: (c) => c.bg[bg], min: text },
    { what: `text.muted on bg.${bg}`, fg: (c) => c.text.muted, bg: (c) => c.bg[bg], min: text },
    { what: `accent on bg.${bg}`, fg: (c) => c.accent.default, bg: (c) => c.bg[bg], min: nonText },
    { what: `guide on bg.${bg}`, fg: (c) => c.guide.default, bg: (c) => c.bg[bg], min: nonText },
    { what: `danger on bg.${bg}`, fg: (c) => c.danger, bg: (c) => c.bg[bg], min: nonText },
    { what: `focus on bg.${bg}`, fg: (c) => c.focus, bg: (c) => c.bg[bg], min: nonText },
  ]),
  ...(["surface", "raised"] as const).map(
    (bg): Check => ({
      what: `danger as text on bg.${bg} (danger button in a sheet)`,
      fg: (c) => c.danger,
      bg: (c) => c.bg[bg],
      min: text,
    }),
  ),
  {
    what: "text.onAccent on accent",
    fg: (c) => c.text.onAccent,
    bg: (c) => c.accent.default,
    min: text,
  },
  {
    what: "text.onAccent on accent.pressed",
    fg: (c) => c.text.onAccent,
    bg: (c) => c.accent.pressed,
    min: text,
  },
  {
    what: "accent on its active background",
    fg: (c) => c.accent.default,
    bg: (c) => blendOver(c.accent.subtle, c.bg.surface),
    min: nonText,
  },
];

const photoBackgrounds: [string, Rgba][] = [
  ...Object.entries(CAMERA_BACKDROPS).flatMap(([name, b]): [string, Rgba][] => [
    [`${name} (dark)`, b.dark],
    [`${name} (bright)`, b.bright],
  ]),
  ["mid grey", REFERENCE_SURFACES.midGrey],
  ["white paper", REFERENCE_SURFACES.whitePaper],
];

describe.each(Object.values(themes))("$name theme", (theme) => {
  const c = theme.color;

  it.each(UI_CHECKS)("$what ≥ $min", ({ fg, bg, min }) => {
    expect(contrastRatio(fg(c), bg(c))).toBeGreaterThanOrEqual(min);
  });

  describe.each(photoBackgrounds)("over the camera: %s", (_name, photo) => {
    const pill = blendOver(c.camera.pill, photo);

    it("pill boundary (fill or edge) ≥ 3", () => {
      const edge = Math.max(
        contrastRatio(c.camera.pill, photo),
        contrastRatio(c.camera.pillEdge, photo),
      );
      expect(edge).toBeGreaterThanOrEqual(nonText);
    });
    it("text inside the pill ≥ 4.5", () => {
      expect(contrastRatio(c.camera.text, pill)).toBeGreaterThanOrEqual(text);
    });
    it("muted text inside the pill ≥ 4.5", () => {
      expect(contrastRatio(c.camera.muted, pill)).toBeGreaterThanOrEqual(text);
    });
    it("accent icon inside the pill ≥ 3", () => {
      expect(contrastRatio(c.camera.accent, pill)).toBeGreaterThanOrEqual(nonText);
    });
    it("guide (core or case) ≥ 3", () => {
      const guide = Math.max(
        contrastRatio(c.camera.guide, photo),
        contrastRatio(c.camera.guideCase, photo),
      );
      expect(guide).toBeGreaterThanOrEqual(nonText);
    });
  });
});

describe.each(Object.values(themes))("$name theme: category palette", (theme) => {
  const c = theme.color;
  const semantic = { accent: c.accent.default, guide: c.guide.default, danger: c.danger };

  describe.each(CATEGORY_COLOR_KEYS)("%s", (key) => {
    it.each(["canvas", "surface", "raised"] as const)("≥ 3 on bg.%s (icon stroke)", (bg) => {
      expect(contrastRatio(c.category[key], c.bg[bg])).toBeGreaterThanOrEqual(nonText);
    });
    it.each(Object.entries(semantic))("is told apart from %s (OKLab ΔE)", (_name, color) => {
      expect(deltaEOk(c.category[key], color)).toBeGreaterThanOrEqual(MIN_CATEGORY_DELTA_E);
    });
  });

  const pairs = CATEGORY_COLOR_KEYS.flatMap((a, i) =>
    CATEGORY_COLOR_KEYS.slice(i + 1).map((b): [CategoryColorKey, CategoryColorKey] => [a, b]),
  );
  it.each(pairs)("%s and %s are told apart (OKLab ΔE)", (a, b) => {
    expect(deltaEOk(c.category[a], c.category[b])).toBeGreaterThanOrEqual(MIN_CATEGORY_DELTA_E);
  });
});

describe("guide on photographs needs its case", () => {
  it("the non-photo core alone is under 3:1 on white paper", () => {
    expect(
      contrastRatio(themes.dark.color.camera.guide, REFERENCE_SURFACES.whitePaper),
    ).toBeLessThan(nonText);
  });
});

describe("accent on photographs", () => {
  it("vermilion alone fails on mid grey, so it only appears on a pill or a surface", () => {
    expect(
      contrastRatio(themes.dark.color.accent.default, REFERENCE_SURFACES.midGrey),
    ).toBeLessThan(nonText);
  });
});
