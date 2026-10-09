import { cameraBackdropColor, cameraColors, space, typography } from "@ar-darwin/ui";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { t } from "../i18n";
import { CameraPermissionGate } from "./CameraPermissionGate";
import { TestImageCanvas } from "./TestImageCanvas";
import { TestImageToggle } from "./TestImageToggle";

const TEST_IMAGES = {
  calibration: require("../../assets/images/test/calibration.png"),
  sketch: require("../../assets/images/test/darwin-i-think.png"),
};

/**
 * Issue #17: back camera at full screen with a Skia canvas on top, at the worst-case 4096 px
 * test image. `constraints={[{ fps: 30 }]}` biases the preview towards the screen's own
 * resolution instead of the sensor's maximum (see docs/ARCHITECTURE.md) — to be measured for
 * real in #20. No gestures, opacity slider, lock or keep-awake yet: #18-#20.
 */
export function CameraSpikeScreen() {
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const [showingSketch, setShowingSketch] = useState(false);

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
            <TestImageCanvas source={TEST_IMAGES[showingSketch ? "sketch" : "calibration"]} />
            <View style={styles.toggleRow} pointerEvents="box-none">
              <TestImageToggle
                showingSketch={showingSketch}
                onToggle={() => setShowingSketch((s) => !s)}
              />
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
  toggleRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: space[10],
    alignItems: "center",
  },
});
