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

/**
 * Semantic haptics from packages/ui mapped to expo-haptics. Note: on iOS the Taptic Engine is
 * silent while the system camera is active, so camera haptics may not fire there.
 */
export function playHaptic(event: HapticEvent): void {
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
