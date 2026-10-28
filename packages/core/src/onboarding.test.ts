import { describe, expect, it } from "vitest";
import {
  cameraPermissionAction,
  ONBOARDING_STEPS,
  stepAfter,
  stepBefore,
  stepIndex,
} from "./onboarding";

describe("onboarding steps", () => {
  it("has three pages: trace, split, camera", () => {
    expect(ONBOARDING_STEPS).toEqual(["trace", "split", "camera"]);
  });

  it("numbers the pages from 0", () => {
    expect(ONBOARDING_STEPS.map(stepIndex)).toEqual([0, 1, 2]);
  });

  it("moves forward and back, and stops at the ends", () => {
    expect(stepAfter("trace")).toBe("split");
    expect(stepAfter("split")).toBe("camera");
    expect(stepAfter("camera")).toBeNull();
    expect(stepBefore("camera")).toBe("split");
    expect(stepBefore("split")).toBe("trace");
    expect(stepBefore("trace")).toBeNull();
  });
});

describe("cameraPermissionAction", () => {
  it("is ready once the permission is granted", () => {
    expect(cameraPermissionAction({ hasPermission: true, canRequestPermission: false })).toBe(
      "ready",
    );
    expect(cameraPermissionAction({ hasPermission: true, canRequestPermission: true })).toBe(
      "ready",
    );
  });

  it("asks while the system still lets the app ask", () => {
    expect(cameraPermissionAction({ hasPermission: false, canRequestPermission: true })).toBe(
      "request",
    );
  });

  it("sends the person to the system settings once it was denied for good", () => {
    expect(cameraPermissionAction({ hasPermission: false, canRequestPermission: false })).toBe(
      "openSettings",
    );
  });
});
