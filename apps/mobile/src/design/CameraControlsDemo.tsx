import { cameraBackdropColor, radius, space } from "@ar-darwin/ui";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { Button } from "../components/Button";
import { FloatingPill } from "../components/FloatingPill";
import { IconButton } from "../components/IconButton";
import { LockButton } from "../components/LockButton";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";

const opacityText = percentFormat(1);

type CameraControlsDemoProps = { opacity: SharedValue<number> };

/**
 * The camera-tone components on a graphite panel standing in for the live image: a pill on the
 * free hand's side that retreats on demand, and the lock (hold 1 s).
 */
export function CameraControlsDemo({ opacity }: CameraControlsDemoProps) {
  const [retreated, setRetreated] = useState(false);
  const [magnet, setMagnet] = useState(true);
  const [flash, setFlash] = useState(false);
  const locked = useSharedValue(false);
  const [isLocked, setIsLocked] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={[styles.panel, { backgroundColor: cameraBackdropColor }]}>
        <FloatingPill
          retreated={retreated}
          placement="freeHand"
          direction="column"
          label={t("devDesign.cameraControls")}
          style={styles.sidePill}
        >
          <IconButton
            icon="magnet"
            label={t("camera.magnet")}
            tone="camera"
            pressed={magnet}
            onPress={() => setMagnet((v) => !v)}
          />
          <IconButton
            icon="flash"
            label={t("camera.flash")}
            tone="camera"
            pressed={flash}
            onPress={() => setFlash((v) => !v)}
          />
          <IconButton icon="rotateCw" label={t("icons.rotateCcw")} tone="camera" flipGlyph />
        </FloatingPill>
        <FloatingPill retreated={retreated} towards="down" style={styles.bottomPill}>
          <View style={styles.sliderSlot}>
            <Slider
              label={t("camera.opacity")}
              value={opacity}
              min={0}
              max={1}
              step={0.01}
              format={opacityText}
              compact
              tone="camera"
            />
          </View>
        </FloatingPill>
        <View style={styles.lockSlot}>
          <LockButton
            locked={locked}
            isLocked={isLocked}
            onLockedChange={setIsLocked}
            placement="free"
          />
        </View>
      </View>
      <Button variant="secondary" onPress={() => setRetreated((v) => !v)}>
        {t(retreated ? "devDesign.showMenu" : "devDesign.retreat")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  panel: { height: 360, borderRadius: radius.lg, overflow: "hidden" },
  sidePill: { top: space[4] },
  bottomPill: {
    position: "absolute",
    left: space[4],
    right: space[4],
    bottom: space[4],
    alignSelf: "auto",
  },
  sliderSlot: { flex: 1, paddingHorizontal: space[3] },
  lockSlot: { position: "absolute", top: space[4], alignSelf: "center" },
});
