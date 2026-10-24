import { space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { IconButton } from "../components/IconButton";
import { t } from "../i18n";
import type { FlipAxis, Flips } from "./useOverlayGestures";

type CameraToolsProps = {
  flips: Flips;
  /** Touch lock: the mirror buttons dim and explain the lock instead of flipping. */
  isLocked: boolean;
  onFlip: (axis: FlipAxis) => void;
  /** A mirror button was tapped while locked. */
  onLockedFlip: () => void;
  /** `null` when the camera has no torch: its button isn't shown. */
  torchOn: boolean | null;
  onTorchChange: (on: boolean) => void;
  adjustOpen: boolean;
  onOpenAdjust: () => void;
};

/**
 * The camera's tool row: mirror H/V, torch and image adjustments. It stays while locked (torch
 * and adjustments still work; the mirror would move the image, so it is dimmed), so nothing
 * around it moves when the lock engages.
 */
export function CameraTools({
  flips,
  isLocked,
  onFlip,
  onLockedFlip,
  torchOn,
  onTorchChange,
  adjustOpen,
  onOpenAdjust,
}: CameraToolsProps) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="mirrorH"
        label={t("camera.mirrorH")}
        tone="camera"
        pressed={flips.flipX}
        disabled={isLocked}
        onDisabledPress={onLockedFlip}
        onPress={() => onFlip("x")}
      />
      <IconButton
        icon="mirrorV"
        label={t("camera.mirrorV")}
        tone="camera"
        pressed={flips.flipY}
        disabled={isLocked}
        onDisabledPress={onLockedFlip}
        onPress={() => onFlip("y")}
      />
      {torchOn !== null && (
        <IconButton
          icon="flash"
          label={t("camera.flash")}
          tone="camera"
          pressed={torchOn}
          onPress={() => onTorchChange(!torchOn)}
        />
      )}
      <IconButton
        icon="adjust"
        label={t("camera.adjust.open")}
        tone="camera"
        pressed={adjustOpen}
        onPress={onOpenAdjust}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: space[3] },
});
