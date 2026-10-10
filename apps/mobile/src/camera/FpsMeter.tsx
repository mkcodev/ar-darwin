import {
  addFrame,
  emptyFrameWindow,
  type FrameSummary,
  type FrameWindow,
  frameBudgetMs,
  summarizeFrameWindow,
} from "@ar-darwin/core";
import { cameraColors, radius, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { t } from "../i18n";

type FpsMeterProps = {
  /** Distance from the top of the screen (safe area included), level with the lock. */
  top: number;
  /** The side the lock is NOT on, so the two never overlap. */
  side: "left" | "right";
};

type Session = { minUi: number; minJs: number; worstMs: number; longFrames: number };

type Reading = { ui: number; js: number; session: Session };

const REFRESH_MS = 1000;

const VALUE_TEXT = toNativeTextStyle(typography.value);

const EMPTY_SESSION: Session = {
  minUi: Number.POSITIVE_INFINITY,
  minJs: Number.POSITIVE_INFINITY,
  worstMs: 0,
  longFrames: 0,
};

/**
 * Discreet fps counter for the 10-minute test (#20). Two counters, one per thread:
 * - UI: Reanimated's `useFrameCallback` feeds every vsync interval to core's `addFrame` on the
 *   UI thread — what gestures and the overlay feel like.
 * - JS: a `requestAnimationFrame` loop on the JS thread, same accounting in a ref.
 * Once a second (never per frame) both windows are summarised into one `setState` and reset.
 * The lines below keep the session's worst: lowest UI/JS second, longest UI frame and total
 * UI hitches (frames over 1.5× the display's budget), the numbers to write down at minute 10.
 *
 * Mounted only while visible: the frame callback asks for a frame on every vsync, so the meter
 * itself adds a little load and must not run when nobody reads it.
 */
export function FpsMeter({ top, side }: FpsMeterProps) {
  const uiWindow = useSharedValue<FrameWindow>(emptyFrameWindow());
  const uiShortest = useSharedValue(Number.POSITIVE_INFINITY);
  const jsWindow = useRef<FrameWindow>(emptyFrameWindow());
  const [reading, setReading] = useState<Reading | null>(null);

  useFrameCallback(({ timeSincePreviousFrame: delta }) => {
    if (delta === null) return;
    uiShortest.value = Math.min(uiShortest.value, delta);
    uiWindow.value = addFrame(uiWindow.value, delta, frameBudgetMs(uiShortest.value));
  });

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    let shortest = Number.POSITIVE_INFINITY;
    const tick = (now: number) => {
      if (last !== null) {
        const delta = now - last;
        shortest = Math.min(shortest, delta);
        jsWindow.current = addFrame(jsWindow.current, delta, frameBudgetMs(shortest));
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    let session = EMPTY_SESSION;
    const refresh = setInterval(() => {
      // Read and reset from JS: a UI frame landing in between is lost, harmless at 1 Hz.
      const ui = summarizeFrameWindow(uiWindow.value);
      const js = summarizeFrameWindow(jsWindow.current);
      uiWindow.value = emptyFrameWindow();
      jsWindow.current = emptyFrameWindow();
      // An empty window (app in background, camera interrupted) says nothing about smoothness.
      if (ui.fps === 0 || js.fps === 0) return;
      session = accumulate(session, ui, js);
      setReading({ ui: ui.fps, js: js.fps, session });
    }, REFRESH_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(refresh);
    };
  }, [uiWindow]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pill, { top }, side === "left" ? { left: space[5] } : { right: space[5] }]}
    >
      <Text style={[VALUE_TEXT, { color: cameraColors.text }]}>
        {reading
          ? t("cameraSpike.fps.now", { ui: reading.ui, js: reading.js })
          : t("cameraSpike.fps.measuring")}
      </Text>
      {reading && (
        <>
          <Text style={[VALUE_TEXT, { color: cameraColors.text }]}>
            {t("cameraSpike.fps.min", { ui: reading.session.minUi, js: reading.session.minJs })}
          </Text>
          <Text style={[VALUE_TEXT, { color: cameraColors.text }]}>
            {t("cameraSpike.fps.hitches", {
              worst: reading.session.worstMs,
              long: reading.session.longFrames,
            })}
          </Text>
        </>
      )}
    </View>
  );
}

function accumulate(session: Session, ui: FrameSummary, js: FrameSummary): Session {
  return {
    minUi: Math.min(session.minUi, ui.fps),
    minJs: Math.min(session.minJs, js.fps),
    worstMs: Math.max(session.worstMs, ui.worstMs),
    longFrames: session.longFrames + ui.longFrames,
  };
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: cameraColors.pillSolid,
    borderWidth: 1,
    borderColor: cameraColors.pillEdge,
  },
});
