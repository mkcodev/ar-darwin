import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAGNET_ENABLED,
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

  it("stores the drawing hand under its own key", () => {
    expect(SETTING_KEYS.drawingHand).toBe("drawing_hand");
    expect(Object.values(SETTING_KEYS)).toHaveLength(new Set(Object.values(SETTING_KEYS)).size);
  });
});
