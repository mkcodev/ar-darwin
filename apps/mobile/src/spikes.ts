/**
 * Whether the spike screens (camera, for now) are reachable. Always in development builds; in a
 * release build only when eas.json's `preview` profile sets `EXPO_PUBLIC_SPIKES=1` (inlined at
 * bundle time), so the fps measurements of issue #20 run on release code. A production build
 * never sets it.
 */
export const spikesEnabled = __DEV__ || process.env.EXPO_PUBLIC_SPIKES === "1";
