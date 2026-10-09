import { cameraBackdropColor, cameraColors, opacity, space, typography } from "@ar-darwin/ui";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { t } from "../i18n";
import { CameraPermissionGate } from "./CameraPermissionGate";
import { OpacitySlider } from "./OpacitySlider";
import { TestImageCanvas } from "./TestImageCanvas";
import { TestImageToggle } from "./TestImageToggle";

const TEST_IMAGES = {
  calibration: require("../../assets/images/test/calibration.png"),
  sketch: require("../../assets/images/test/darwin-i-think.png"),
};

/**
 * Issue #17 (camera + test image) and #18 (drag/pinch/rotate with two fingers at once, double
 * tap to reset, opacity slider — all in `TestImageCanvas`/`useOverlayGestures`). `constraints={[{
 * fps: 30 }]}` biases the preview towards the screen's own resolution instead of the sensor's
 * maximum (see docs/ARCHITECTURE.md) — to be measured for real in #20. No lock or keep-awake
 * yet: #19-#20.
 */
export function CameraSpikeScreen() {
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const [showingSketch, setShowingSketch] = useState(false);
  const imageOpacity = useSharedValue<number>(opacity.overlayImage);

  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
      <StatusBar style="light" />
      <CameraPermissionGate>
        {device ? (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused}
              constraints={[{ fps: 30 }]}
            />
            <TestImageCanvas
              source={TEST_IMAGES[showingSketch ? "sketch" : "calibration"]}
              opacity={imageOpacity}
            />
            <View style={styles.controls} pointerEvents="box-none">
              <OpacitySlider value={imageOpacity} />
              <View style={styles.toggleRow}>
                <TestImageToggle
                  showingSketch={showingSketch}
                  onToggle={() => setShowingSketch((s) => !s)}
                />
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.noDevice, { color: cameraColors.text }]}>
            {t("cameraSpike.noDevice")}
          </Text>
        )}
      </CameraPermissionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  noDevice: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  controls: {
    position: "absolute",
    left: space[5],
    right: space[5],
    bottom: space[10],
    gap: space[4],
  },
  toggleRow: { alignItems: "center" },
});
