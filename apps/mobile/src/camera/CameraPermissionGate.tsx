import {
  cameraBackdropColor,
  cameraColors,
  radius,
  space,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { type ReactNode, useEffect } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useCameraPermission } from "react-native-vision-camera";
import { t } from "../i18n";

/**
 * Gates `children` behind the camera permission. Asks for it once on mount while it can
 * (vision-camera's own recommended pattern); if the user has already denied it, the OS won't
 * let it ask again, so the button below sends them to the system Settings instead. Always on
 * the camera's dark colours (packages/ui's `cameraColors`, the same in both themes): it only
 * ever sits over the live camera or its graphite backdrop.
 */
export function CameraPermissionGate({ children }: { children: ReactNode }) {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (canRequestPermission) requestPermission();
  }, [canRequestPermission, requestPermission]);

  if (hasPermission) return <>{children}</>;

  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
      <Text style={[styles.title, { color: cameraColors.text }]}>
        {t("cameraSpike.permissionTitle")}
      </Text>
      <Text style={[styles.body, { color: cameraColors.text }]}>
        {t("cameraSpike.permissionBody")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={canRequestPermission ? requestPermission : Linking.openSettings}
        style={[
          styles.button,
          { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: cameraColors.accent }]}>
          {t(canRequestPermission ? "cameraSpike.grant" : "cameraSpike.openSettings")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space[4],
    padding: space[6],
  },
  title: { fontSize: typography.title.size, lineHeight: typography.title.lineHeight },
  body: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    textAlign: "center",
  },
  button: {
    minHeight: touchTarget,
    paddingHorizontal: space[5],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonLabel: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
