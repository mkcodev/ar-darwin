/**
 * What to tell the person when the camera can't open, from the plain-text message
 * react-native-vision-camera's `onError` hands over (no error code in its JS API — see
 * CameraState.StateError.reason on Android, e.g. "Camera is disabled, probably due to a device
 * policy!" or "Camera device is already in use!"). Runs on the JS thread (inside `onError`,
 * never a worklet), so it is plain pure JS, not a worklet like transform.ts.
 */
export type CameraIssueKind = "disabled" | "inUse" | "unknown";

export function classifyCameraIssue(message: string): CameraIssueKind {
  const text = message.toLowerCase();
  if (
    text.includes("disabled") ||
    text.includes("do-not-disturb") ||
    text.includes("do not disturb")
  ) {
    return "disabled";
  }
  if (text.includes("in use") || text.includes("maximum number of open cameras")) {
    return "inUse";
  }
  return "unknown";
}
