import { describe, expect, it } from "vitest";
import { isCategoryColorKey } from "./categoryColors";
import { haptics } from "./haptics";
import { icons, isIconName } from "./icons";
import { controlsSide, radius, space, touchTarget } from "./layout";
import {
  dampingRatio,
  duration,
  resolveMotion,
  sampleSpring,
  spring,
  springSettleMs,
  toCssEasing,
  toMotionSpring,
  toReanimatedSpring,
} from "./motion";
import { DEFAULT_THEME_PREFERENCE, darkTheme, lightTheme, resolveTheme } from "./themes";
import { toNativeTextStyle, toWebTextStyle, typography } from "./typography";
import { toCssTokenVariables, toCssVariables } from "./web/toCssVariables";

describe("spacing and shape", () => {
  it("spacing is base 4", () => {
    for (const v of Object.values(space)) expect(v % 4).toBe(0);
  });
  it("sheets use 24 px corners and targets are 48 px", () => {
    expect(radius.sheet).toBe(24);
    expect(touchTarget).toBe(48);
  });
});

describe("motion", () => {
  it("durations sit in the documented bands", () => {
    expect(duration.micro.ms).toBeGreaterThanOrEqual(120);
    expect(duration.micro.ms).toBeLessThanOrEqual(180);
    for (const t of [duration.short, duration.medium, duration.long]) {
      expect(t.ms).toBeGreaterThanOrEqual(220);
      expect(t.ms).toBeLessThanOrEqual(320);
    }
  });
  it("every duration and spring has a reduced equivalent", () => {
    for (const t of [...Object.values(duration), ...Object.values(spring)]) {
      expect(["fade", "none"]).toContain(t.reduced.kind);
      if (t.reduced.kind === "fade") expect(t.reduced.duration).toBeLessThanOrEqual(150);
    }
  });
  it("snappy bounces slightly and gentle barely", () => {
    expect(dampingRatio(spring.snappy)).toBeGreaterThan(0.7);
    expect(dampingRatio(spring.snappy)).toBeLessThan(0.8);
    expect(dampingRatio(spring.gentle)).toBeGreaterThan(0.9);
  });
  it("adapters keep the physics values", () => {
    expect(toReanimatedSpring(spring.sheet)).toEqual({ stiffness: 260, damping: 30, mass: 1 });
    expect(toMotionSpring(spring.snappy)).toEqual({
      type: "spring",
      stiffness: 420,
      damping: 31,
      mass: 1,
    });
  });
  it("resolveMotion swaps in the reduced variant", () => {
    expect(resolveMotion(spring.snappy, false)).toEqual({ kind: "full", token: spring.snappy });
    expect(resolveMotion(spring.snappy, true)).toEqual({ kind: "fade", duration: 120 });
    expect(resolveMotion(spring.playful, true)).toEqual({ kind: "none" });
  });
  it("formats easings for CSS", () => {
    expect(toCssEasing([0.2, 0, 0, 1])).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });
});

describe("typography", () => {
  it("value uses tabular figures", () => {
    expect(toNativeTextStyle(typography.value).fontVariant).toEqual(["tabular-nums"]);
    expect(toWebTextStyle(typography.value).fontVariantNumeric).toBe("tabular-nums");
    expect(toNativeTextStyle(typography.body).fontVariant).toBeUndefined();
  });
  it("maps weights to font files on native", () => {
    expect(toNativeTextStyle(typography.title).fontFamily).toBe("Geist-SemiBold");
    expect(toNativeTextStyle(typography.display).fontFamily).toBe("InstrumentSerif-Italic");
    expect(toWebTextStyle(typography.display).fontStyle).toBe("italic");
  });
});

describe("themes", () => {
  it("follow the system by default and fall back to dark", () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe("system");
    expect(resolveTheme("system", "light")).toBe(lightTheme);
    expect(resolveTheme("system", null)).toBe(darkTheme);
    expect(resolveTheme("dark", "light")).toBe(darkTheme);
  });
  it("share one always-dark camera and a light status bar inside it", () => {
    expect(lightTheme.color.camera).toBe(darkTheme.color.camera);
    expect(lightTheme.statusBar.camera).toBe("light");
    expect(lightTheme.statusBar.app).toBe("dark");
  });
  it("have the same token keys", () => {
    expect(Object.keys(toCssVariables(lightTheme))).toEqual(Object.keys(toCssVariables(darkTheme)));
  });
});

describe("toCssVariables", () => {
  it("flattens tokens into custom properties", () => {
    const vars = toCssVariables(darkTheme);
    expect(vars["--color-bg-canvas"]).toBe("#161614");
    expect(vars["--color-accent"]).toBe("#FF5A1F");
    expect(vars["--color-accent-pressed"]).toBe("#E54A12");
    expect(vars["--color-camera-pill-edge"]).toBe("rgba(241, 236, 225, 0.46)");
  });
});

describe("toCssTokenVariables", () => {
  it("exposes layout, motion and type tokens with units", () => {
    const vars = toCssTokenVariables();
    expect(vars["--space-4"]).toBe("16px");
    expect(vars["--radius-sheet"]).toBe("24px");
    expect(vars["--duration-micro"]).toBe("150ms");
    expect(vars["--easing-draw"]).toBe("cubic-bezier(0.2, 0.7, 0.2, 1)");
    expect(vars["--type-value-numeric"]).toBe("tabular-nums");
    expect(vars["--type-display-style"]).toBe("italic");
    expect(vars["--touch-target"]).toBe("48px");
  });
});

describe("spring sampling", () => {
  const peak = (s: (typeof spring)[keyof typeof spring]) => Math.max(...sampleSpring(s, 1500));
  it("ends at the target", () => {
    for (const s of Object.values(spring)) expect(sampleSpring(s, 2000).at(-1)).toBeCloseTo(1, 2);
  });
  it("screen never overshoots; snappy and playful do", () => {
    expect(peak(spring.screen)).toBeLessThanOrEqual(1.0005);
    expect(peak(spring.snappy)).toBeGreaterThan(1.01);
    expect(peak(spring.playful)).toBeGreaterThan(peak(spring.snappy));
  });
  it("micro springs settle within the transition band", () => {
    expect(springSettleMs(spring.snappy)).toBeLessThan(400);
    expect(springSettleMs(spring.sheet)).toBeLessThan(500);
  });
});

describe("haptics, icons and handedness", () => {
  it("has the 28 icons of the set", () => {
    expect(Object.keys(icons)).toHaveLength(28);
  });
  it("narrows stored icon names", () => {
    expect(isIconName("animal")).toBe(true);
    expect(isIconName("toString")).toBe(false);
    expect(isIconName("")).toBe(false);
  });
  it("narrows stored category colour keys", () => {
    expect(isCategoryColorKey("ochre")).toBe(true);
    expect(isCategoryColorKey("#FEB43A")).toBe(false);
  });
  it("map every semantic event to an expo-haptics family", () => {
    for (const h of Object.values(haptics))
      expect(["impact", "selection", "notification"]).toContain(h.kind);
  });
  it("keep icon geometry inside the 24 grid", () => {
    for (const shapes of Object.values(icons)) {
      for (const s of shapes) {
        if (s.type === "rect") expect(s.x + s.width).toBeLessThanOrEqual(24);
        if (s.type === "circle") expect(s.cx + s.r).toBeLessThanOrEqual(24);
        if (s.type === "path")
          for (const n of s.d.match(/-?\d+(\.\d+)?/g) ?? [])
            expect(Math.abs(Number(n))).toBeLessThanOrEqual(24);
      }
    }
  });
  it("put camera controls under the free hand", () => {
    expect(controlsSide("right")).toBe("left");
    expect(controlsSide("left")).toBe("right");
  });
});
