import { type ImageAdjustments, NEUTRAL_ADJUSTMENTS } from "@ar-darwin/core";
import { spring } from "@ar-darwin/ui";
import { useState } from "react";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Slider } from "../components/Slider";
import { Toggle } from "../components/Toggle";
import { usePercentFormat } from "../format";
import { t } from "../i18n";
import { animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import type { OverlayAdjustments } from "./OverlayCanvas";

type ImageAdjustSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Shared with `OverlayCanvas`: the image previews every change live. */
  adjustments: OverlayAdjustments;
  /** A slider was released, invert toggled or everything reset: never per frame. */
  onSettle?: (adjustments: ImageAdjustments) => void;
};

/**
 * Brightness, contrast and invert of the overlay image, in a sheet with no scrim so the camera
 * and the image stay fully visible behind it. Sliders write the shared values straight away (the
 * canvas redraws on the UI thread); invert and reset animate them with the `gentle` spring, or
 * jump under reduced motion. Each settled change is reported once, to be saved.
 */
export function ImageAdjustSheet({ open, onClose, adjustments, onSettle }: ImageAdjustSheetProps) {
  const levelText = usePercentFormat(1);
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.gentle, reduce);
  const { brightness, contrast, invert } = adjustments;
  const [inverted, setInverted] = useState(() => invert.value === 1);

  const settle = (next: Partial<ImageAdjustments>) => {
    onSettle?.({
      brightness: brightness.value,
      contrast: contrast.value,
      invert: inverted,
      ...next,
    });
  };

  const changeInverted = (next: boolean) => {
    setInverted(next);
    invert.value = animateMove(next ? 1 : 0, plan);
    settle({ invert: next });
  };

  const reset = () => {
    setInverted(false);
    brightness.value = animateMove(NEUTRAL_ADJUSTMENTS.brightness, plan);
    contrast.value = animateMove(NEUTRAL_ADJUSTMENTS.contrast, plan);
    invert.value = animateMove(0, plan);
    onSettle?.(NEUTRAL_ADJUSTMENTS);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("camera.adjust.title")}
      handleLabel={t("camera.adjust.handle")}
      scrim={false}
    >
      <Slider
        label={t("camera.adjust.brightness")}
        value={brightness}
        min={-1}
        max={1}
        step={0.01}
        format={levelText}
        onChangeEnd={(value) => settle({ brightness: value })}
      />
      <Slider
        label={t("camera.adjust.contrast")}
        value={contrast}
        min={-1}
        max={1}
        step={0.01}
        format={levelText}
        onChangeEnd={(value) => settle({ contrast: value })}
      />
      <Toggle label={t("camera.adjust.invert")} checked={inverted} onChange={changeInverted} />
      <Button variant="secondary" icon="reset" onPress={reset}>
        {t("camera.adjust.reset")}
      </Button>
    </BottomSheet>
  );
}
