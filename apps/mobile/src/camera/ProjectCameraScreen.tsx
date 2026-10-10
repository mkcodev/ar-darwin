import type { Project } from "@ar-darwin/core";
import { cameraBackdropColor } from "@ar-darwin/ui";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { t } from "../i18n";
import { CameraNotice } from "./CameraNotice";
import { CameraOverlayScreen } from "./CameraOverlayScreen";
import { useProjectCameraSession } from "./useProjectCameraSession";
import { useProjectImage } from "./useProjectImage";

type ProjectCameraScreenProps = {
  project: Project;
  /** Leaves the camera (the image is missing). */
  onLeave: () => void;
};

/**
 * A project's camera: its image over the camera where it was left (`useProjectCameraSession`
 * restores and saves it). While the image decodes, the dark backdrop; if it can't be found or
 * decoded, a notice with a way back instead of an empty camera.
 */
export function ProjectCameraScreen({ project, onLeave }: ProjectCameraScreenProps) {
  const image = useProjectImage(project.sourceUri);
  const session = useProjectCameraSession(project, image.status === "ready");

  if (image.status === "missing") {
    return (
      <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
        <StatusBar style="light" />
        <CameraNotice
          title={t("camera.imageMissing.title")}
          body={t("camera.imageMissing.body")}
          actions={[{ label: t("camera.imageMissing.back"), onPress: onLeave }]}
        />
      </View>
    );
  }

  return (
    <CameraOverlayScreen
      image={image.status === "ready" ? image.image : null}
      initialOpacity={session.initialOpacity}
      initialPlacement={session.initialPlacement}
      onPlacementSettle={session.onPlacementSettle}
      onOpacitySettle={session.onOpacitySettle}
    />
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
