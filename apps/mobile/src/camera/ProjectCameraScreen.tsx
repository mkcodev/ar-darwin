import {
  cameraCrop,
  nextTileId,
  type Project,
  previousTileId,
  samePlacement,
  splitGridAspect,
} from "@ar-darwin/core";
import { cameraBackdropColor } from "@ar-darwin/ui";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";
import { CameraNotice } from "./CameraNotice";
import { CameraOverlayScreen } from "./CameraOverlayScreen";
import { TileBar } from "./TileBar";
import { TilePicker } from "./TilePicker";
import type { OverlayPlacement } from "./useOverlayGestures";
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
  const [choice, setChoice] = useState<"last" | "pin" | null>(null);
  // The camera moves between tiles on its own; the session saves each one.
  const [tileId, setTileId] = useState(project.currentTileId);
  const [pickerOpen, setPickerOpen] = useState(false);

  // A split project traces its current tile, not the whole image (a project that was never split,
  // or whose grid no longer fits the image, shows all of it).
  const readyImage = image.status === "ready" ? image.image : null;
  const crop = useMemo(() => {
    if (readyImage === null) return null;
    try {
      return cameraCrop(
        { width: readyImage.width(), height: readyImage.height() },
        project.split,
        tileId,
      );
    } catch (error) {
      console.warn(`ProjectCameraScreen: could not crop project ${project.id}`, error);
      return null;
    }
  }, [readyImage, project.split, tileId, project.id]);

  // Next, previous or a cell of the picker: another sheet, with the zoom, rotation, mirror, opacity
  // and pin as they are (`OverlayCanvas` keeps the placement when only the crop changes).
  const split = project.split;
  const goToTile = (id: string) => {
    setTileId(id);
    session.onTileChange(id);
    playHaptic("tileChange");
  };
  const hasTiles =
    readyImage !== null && split !== undefined && crop !== null && split.rows * split.cols > 1;
  const tileBar = hasTiles ? (
    <TileBar
      rows={split.rows}
      cols={split.cols}
      aspect={splitGridAspect({ width: readyImage.width(), height: readyImage.height() }, split)}
      tileId={crop.tileId}
      previousId={previousTileId(split, crop.tileId)}
      nextId={nextTileId(split, crop.tileId)}
      onPrevious={() => goToTile(previousTileId(split, crop.tileId))}
      onNext={() => goToTile(nextTileId(split, crop.tileId))}
      onOpenPicker={() => setPickerOpen(true)}
    />
  ) : null;
  const tilePicker = hasTiles ? (
    <TilePicker
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      image={readyImage}
      split={split}
      currentId={crop.tileId}
      onPick={goToTile}
    />
  ) : null;

  // A pinned position that differs from where the image was left: ask which one to open with,
  // before the camera mounts, so the image is placed once, where it was chosen.
  const { initialPlacement, initialPin } = session;
  const mustChoose =
    initialPin !== null &&
    initialPlacement !== null &&
    !samePlacement(initialPlacement, initialPin);

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

  if (mustChoose && choice === null) {
    return (
      <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
        <StatusBar style="light" />
        <CameraNotice
          title={t("camera.pinChoice.title")}
          body={t("camera.pinChoice.body")}
          actions={[
            { label: t("camera.pinChoice.keepLast"), onPress: () => setChoice("last") },
            { label: t("camera.pinChoice.usePin"), onPress: () => setChoice("pin") },
          ]}
        />
      </View>
    );
  }

  // The pin brings back position, size and rotation; the mirror stays as it was left.
  const placement: OverlayPlacement | null =
    choice === "pin" && initialPin !== null && initialPlacement !== null
      ? {
          transform: {
            ...initialPin.transform,
            flipX: initialPlacement.transform.flipX,
            flipY: initialPlacement.transform.flipY,
          },
          viewport: initialPin.viewport,
        }
      : initialPlacement;

  return (
    <CameraOverlayScreen
      image={readyImage}
      crop={crop}
      initialOpacity={session.initialOpacity}
      initialPlacement={placement}
      initialPin={initialPin}
      onPinChange={session.onPinChange}
      onPlacementSettle={session.onPlacementSettle}
      onOpacitySettle={session.onOpacitySettle}
      initialAdjustments={session.initialAdjustments}
      onAdjustmentsSettle={session.onAdjustmentsSettle}
      tileBar={tileBar}
      menuPaused={pickerOpen}
      overlay={tilePicker}
    />
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
