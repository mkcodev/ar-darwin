import {
  cameraBackdropColor,
  cameraColors,
  radius,
  space,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type CameraNoticeAction = { label: string; onPress: () => void };

type CameraNoticeProps = {
  title: string;
  body: string;
  actions: readonly CameraNoticeAction[];
};

/**
 * A full-screen message over the dark camera backdrop, with pill buttons: shown instead of a
 * black screen when the camera or the project's image can't be used. Same layout as
 * `CameraPermissionGate`.
 */
export function CameraNotice({ title, body, actions }: CameraNoticeProps) {
  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
      <Text style={[styles.title, { color: cameraColors.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.body, { color: cameraColors.text }]}>{body}</Text>
      <View style={styles.buttons}>
        {actions.map(({ label, onPress }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={onPress}
            style={[
              styles.button,
              { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
            ]}
          >
            <Text style={[styles.buttonLabel, { color: cameraColors.accent }]}>{label}</Text>
          </Pressable>
        ))}
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
  title: {
    fontSize: typography.title.size,
    lineHeight: typography.title.lineHeight,
    textAlign: "center",
  },
  body: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    textAlign: "center",
  },
  buttons: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[3] },
  button: {
    minHeight: touchTarget,
    paddingHorizontal: space[5],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonLabel: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
