import { describe, expect, it } from "vitest";
import { DEFAULT_MAGNET_ENABLED, parseBooleanSetting, serializeBoolean } from "./settings";

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
