/**
 * Semantic haptics. Levels mirror expo-haptics without importing it: apps map
 * impact levels to `impactAsync(ImpactFeedbackStyle.X)`, "selection" to `selectionAsync()` and
 * notifications to `notificationAsync(NotificationFeedbackType.X)`.
 */
export type HapticLevel =
  | { kind: "impact"; style: "light" | "medium" | "heavy" }
  | { kind: "selection" }
  | { kind: "notification"; type: "success" | "warning" | "error" };

export const haptics = {
  /** The image lands on a magnet guide (the guide list goes from empty to not empty). */
  guideSnap: { kind: "impact", style: "light" },
  /** Lock or unlock position and touches. */
  lockToggle: { kind: "impact", style: "medium" },
  /** Next tile in the camera, or a tile picked in the splitter. */
  tileChange: { kind: "selection" },
  /** One fine-adjust step. Not fired on long-press repeats. */
  nudgeStep: { kind: "selection" },
  /** A value hits its limit (max overlap, 10 rows, minimum scale). */
  limitReached: { kind: "notification", type: "warning" },
  error: { kind: "notification", type: "error" },
} as const satisfies Record<string, HapticLevel>;

export type HapticEvent = keyof typeof haptics;
