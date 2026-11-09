import { DEFAULT_HAPTICS_ENABLED } from "@ar-darwin/core";
import { type HapticEvent, haptics } from "@ar-darwin/ui";
import * as Haptics from "expo-haptics";

const impact = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

const notification = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

let enabled = DEFAULT_HAPTICS_ENABLED;

/**
 * The «Vibración» switch of Settings, for the whole app. A module flag, not context: `playHaptic`
 * is also reached from worklets (through the JS thread) and from plain functions, which have no
 * React tree to read. `AppSettingsProvider` sets it once the stored value is read, and on change.
 */
export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

/**
 * Semantic haptics from packages/ui mapped to expo-haptics. Nothing plays while the switch in
 * Settings is off. Note: on iOS the Taptic Engine is silent while the system camera is active, so
 * camera haptics may not fire there.
 */
export function playHaptic(event: HapticEvent): void {
  if (!enabled) return;
  const level = haptics[event];
  const run =
    level.kind === "impact"
      ? Haptics.impactAsync(impact[level.style])
      : level.kind === "selection"
        ? Haptics.selectionAsync()
        : Haptics.notificationAsync(notification[level.type]);
  run.catch(() => {
    // No haptics hardware or disabled by the user: nothing to do.
  });
}
