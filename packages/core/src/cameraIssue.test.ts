import { describe, expect, it } from "vitest";
import { classifyCameraIssue } from "./cameraIssue";

describe("classifyCameraIssue", () => {
  it.each([
    ["Camera is disabled, probably due to a device policy!", "disabled"],
    ["Camera cannot be opened while Do-Not-Disturb mode is enabled!", "disabled"],
    ["Camera device is already in use!", "inUse"],
    [
      "The maximum number of open cameras has been reached, and more cameras cannot be opened until other instances are closed!",
      "inUse",
    ],
    ["Encountered a fatal Camera error!", "unknown"],
    ["Failed to apply the stream configuration for the given outputs!", "unknown"],
  ] as const)("classifies %s as %s", (message, kind) => {
    expect(classifyCameraIssue(message)).toBe(kind);
  });

  it("is case-insensitive", () => {
    expect(classifyCameraIssue("CAMERA IS DISABLED")).toBe("disabled");
  });
});
