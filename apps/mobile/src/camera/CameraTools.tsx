import { lockButton, space } from "@ar-darwin/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingPill } from "../components/FloatingPill";
import { IconButton } from "../components/IconButton";
import { t } from "../i18n";
import type { FlipAxis, Flips } from "./useOverlayGestures";

type CameraToolsProps = {
  /** The menu is idle: the rail retreats towards its edge and stops taking touches. */
  retreated: boolean;
  flips: Flips;
  /** Touch lock: the mirror buttons dim and explain the lock instead of flipping. */
  isLocked: boolean;
  onFlip: (axis: FlipAxis) => void;
  /** A mirror button was tapped while locked. */
  onLockedFlip: () => void;
  /** `null` when the camera has no torch: its button isn't shown. */
  torchOn: boolean | null;
  onTorchChange: (on: boolean) => void;
  /** The fine-adjust pad is showing. */
  nudgeOpen: boolean;
  onToggleNudge: () => void;
  adjustOpen: boolean;
  onOpenAdjust: () => void;
};

/**
 * The camera's tool rail: mirror H/V, torch, the fine-adjust pad and image adjustments, in a
 * vertical pill on the free hand's side, under the lock. It stays while locked (torch,
 * adjustments and opening the pad still work; the mirror would move the image, so it is dimmed),
 * so nothing around it moves when the lock engages. It retreats with the rest of the menu.
 */
export function CameraTools({
  retreated,
  flips,
  isLocked,
  onFlip,
  onLockedFlip,
  torchOn,
  onTorchChange,
  nudgeOpen,
  onToggleNudge,
  adjustOpen,
  onOpenAdjust,
}: CameraToolsProps) {
  const insets = useSafeAreaInsets();
  return (
    <FloatingPill
      retreated={retreated}
      placement="freeHand"
      direction="column"
      label={t("camera.menu.tools")}
      style={{ top: insets.top + space[5] + lockButton.size + space[4] }}
    >
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
        icon="nudge"
        label={t("camera.menu.nudge")}
        tone="camera"
        pressed={nudgeOpen}
        onPress={onToggleNudge}
      />
      <IconButton
        icon="adjust"
        label={t("camera.adjust.open")}
        tone="camera"
        pressed={adjustOpen}
        onPress={onOpenAdjust}
      />
    </FloatingPill>
  );
}
