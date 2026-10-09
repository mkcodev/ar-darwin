import { type HapticEvent, type HapticLevel, haptics } from "@ar-darwin/ui";

/** Vibration length (ms) standing in for each expo-haptics family on the web. */
function pattern(level: HapticLevel): number | number[] {
  switch (level.kind) {
    case "selection":
      return 6;
    case "impact":
      return level.style === "light" ? 10 : level.style === "medium" ? 18 : 26;
    case "notification":
      return level.type === "success" ? [10, 40, 10] : [18, 50, 18];
  }
}

/** Web stand-in for the app's haptics: navigator.vibrate where available (Android Chrome). */
export function playHaptic(event: HapticEvent): void {
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern(haptics[event]));
  } catch {
    // Some browsers block vibration without a user gesture.
  }
}
