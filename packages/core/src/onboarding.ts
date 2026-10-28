/** The onboarding's pages, in order. */
export const ONBOARDING_STEPS = ["trace", "split", "camera"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Position of a step, from 0. */
export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

/** The page after `step`, or `null` on the last one. */
export function stepAfter(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[stepIndex(step) + 1] ?? null;
}

/** The page before `step`, or `null` on the first one. */
export function stepBefore(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[stepIndex(step) - 1] ?? null;
}

/**
 * What the camera permission button does. With the permission it is not needed (`ready`); while the
 * system still lets the app ask, it asks (`request`); once it was denied for good the system never
 * shows the dialog again, so the person is sent to the system settings (`openSettings`).
 */
export function cameraPermissionAction(state: {
  hasPermission: boolean;
  canRequestPermission: boolean;
}): "ready" | "request" | "openSettings" {
  if (state.hasPermission) return "ready";
  return state.canRequestPermission ? "request" : "openSettings";
}
