import type { CameraIssueKind } from "@ar-darwin/core";
import {
  cameraBackdropColor,
  cameraColors,
  radius,
  space,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";

type CameraIssueNoticeProps = {
  kind: CameraIssueKind;
  onRetry: () => void;
};

/**
 * Shown instead of a black screen (issue #19) when `<Camera>`'s `onError` fires, or CameraX
 * reports the camera is busy as an interruption (see `CameraSpikeScreen`'s `onInterruptionStarted`).
 * Same layout as `CameraPermissionGate`: both only ever sit over the dark camera backdrop.
 */
export function CameraIssueNotice({ kind, onRetry }: CameraIssueNoticeProps) {
  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
      <Text style={[styles.title, { color: cameraColors.text }]}>
        {t(`cameraSpike.issue.${kind}.title`)}
      </Text>
      <Text style={[styles.body, { color: cameraColors.text }]}>
        {t(`cameraSpike.issue.${kind}.body`)}
      </Text>
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={[
            styles.button,
            { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: cameraColors.accent }]}>
            {t("cameraSpike.retry")}
          </Text>
        </Pressable>
        {kind === "disabled" && (
          <Pressable
            accessibilityRole="button"
            onPress={Linking.openSettings}
            style={[
              styles.button,
              { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
            ]}
          >
            <Text style={[styles.buttonLabel, { color: cameraColors.accent }]}>
              {t("cameraSpike.openSettings")}
            </Text>
          </Pressable>
        )}
      </View>
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
  buttons: { flexDirection: "row", gap: space[3] },
  button: {
    minHeight: touchTarget,
    paddingHorizontal: space[5],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonLabel: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
