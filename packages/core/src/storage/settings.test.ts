import { describe, expect, it } from "vitest";
import {
  DEFAULT_HAPTICS_ENABLED,
  DEFAULT_MAGNET_ENABLED,
  DEFAULT_ONBOARDING_DONE,
  DEFAULT_REDUCE_MOTION_PREFERENCE,
  parseBooleanSetting,
  parseChoiceSetting,
  parseNumberChoiceSetting,
  REDUCE_MOTION_PREFERENCES,
  reduceMotionOverride,
  SETTING_KEYS,
  serializeBoolean,
  serializeNumber,
} from "./settings";

describe("parseBooleanSetting", () => {
  it("round-trips both values", () => {
    expect(parseBooleanSetting(serializeBoolean(true), false)).toBe(true);
    expect(parseBooleanSetting(serializeBoolean(false), true)).toBe(false);
  });

  it.each([undefined, null, "", "true", "yes", "2", 1, {}])("falls back on %j", (raw) => {
    expect(parseBooleanSetting(raw, true)).toBe(true);
    expect(parseBooleanSetting(raw, false)).toBe(false);
  });

  it("has the magnet on by default", () => {
    expect(DEFAULT_MAGNET_ENABLED).toBe(true);
  });

  it("has the onboarding not seen by default, and keeps it seen once stored", () => {
    expect(DEFAULT_ONBOARDING_DONE).toBe(false);
    expect(parseBooleanSetting(null, DEFAULT_ONBOARDING_DONE)).toBe(false);
    expect(parseBooleanSetting(serializeBoolean(true), DEFAULT_ONBOARDING_DONE)).toBe(true);
    expect(parseBooleanSetting("yes", DEFAULT_ONBOARDING_DONE)).toBe(false);
  });
});

describe("parseChoiceSetting", () => {
  const hands = ["right", "left"] as const;

  it.each(hands)("reads back %s", (hand) => {
    expect(parseChoiceSetting(hand, hands, "right")).toBe(hand);
  });

  it.each([undefined, null, "", "Right", "both", 1, {}])("falls back on %j", (raw) => {
    expect(parseChoiceSetting(raw, hands, "right")).toBe("right");
    expect(parseChoiceSetting(raw, hands, "left")).toBe("left");
  });

  it("reads back a theme and a language, and falls back on a corrupt value", () => {
    const themes = ["system", "light", "dark"] as const;
    const languages = ["system", "es", "en"] as const;
    expect(parseChoiceSetting("light", themes, "system")).toBe("light");
    expect(parseChoiceSetting("sepia", themes, "system")).toBe("system");
    expect(parseChoiceSetting("en", languages, "system")).toBe("en");
    expect(parseChoiceSetting("fr", languages, "system")).toBe("system");
    expect(parseChoiceSetting(null, languages, "system")).toBe("system");
  });

  it("stores each preference under its own key", () => {
    expect(SETTING_KEYS.drawingHand).toBe("drawing_hand");
    expect(SETTING_KEYS.themePreference).toBe("theme_preference");
    expect(SETTING_KEYS.language).toBe("language");
    expect(SETTING_KEYS.onboardingDone).toBe("onboarding_done");
    expect(SETTING_KEYS.reduceMotion).toBe("reduce_motion");
    expect(SETTING_KEYS.hapticsEnabled).toBe("haptics_enabled");
    expect(SETTING_KEYS.defaultOpacity).toBe("default_opacity");
    expect(SETTING_KEYS.defaultPaper).toBe("default_paper");
    expect(SETTING_KEYS.defaultOrientation).toBe("default_orientation");
    expect(Object.values(SETTING_KEYS)).toHaveLength(new Set(Object.values(SETTING_KEYS)).size);
  });
});

describe("parseNumberChoiceSetting", () => {
  const choices = [0.4, 0.62, 0.8] as const;

  it.each(choices)("round-trips %d", (value) => {
    expect(parseNumberChoiceSetting(serializeNumber(value), choices, 0.62)).toBe(value);
  });

  it.each([undefined, null, "", " ", "abc", "NaN", "Infinity", "0.5", "1", 0.4, {}])(
    "falls back on %j",
    (raw) => {
      expect(parseNumberChoiceSetting(raw, choices, 0.62)).toBe(0.62);
    },
  );
});

describe("reduce motion preference", () => {
  it("follows the system by default", () => {
    expect(DEFAULT_REDUCE_MOTION_PREFERENCE).toBe("system");
    expect(reduceMotionOverride(DEFAULT_REDUCE_MOTION_PREFERENCE)).toBeNull();
  });

  it("forces it on or off", () => {
    expect(reduceMotionOverride("on")).toBe(true);
    expect(reduceMotionOverride("off")).toBe(false);
  });

  it("reads back each preference and falls back on a corrupt value", () => {
    for (const preference of REDUCE_MOTION_PREFERENCES) {
      expect(parseChoiceSetting(preference, REDUCE_MOTION_PREFERENCES, "system")).toBe(preference);
    }
    expect(parseChoiceSetting("1", REDUCE_MOTION_PREFERENCES, "system")).toBe("system");
  });
});

describe("haptics", () => {
  it("are on by default and stay off once stored off", () => {
    expect(DEFAULT_HAPTICS_ENABLED).toBe(true);
    expect(parseBooleanSetting(null, DEFAULT_HAPTICS_ENABLED)).toBe(true);
    expect(parseBooleanSetting(serializeBoolean(false), DEFAULT_HAPTICS_ENABLED)).toBe(false);
  });
});
