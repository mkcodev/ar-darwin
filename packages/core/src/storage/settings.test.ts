import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAGNET_ENABLED,
  DEFAULT_ONBOARDING_DONE,
  parseBooleanSetting,
  parseChoiceSetting,
  SETTING_KEYS,
  serializeBoolean,
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
    expect(Object.values(SETTING_KEYS)).toHaveLength(new Set(Object.values(SETTING_KEYS)).size);
  });
});
