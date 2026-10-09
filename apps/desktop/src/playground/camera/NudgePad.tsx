import { NUDGE_STEPS, type NudgeAction, type NudgeStep } from "@ar-darwin/core";
import type { IconName } from "@ar-darwin/ui";
import { t } from "../../i18n";
import { NudgeButton, type RepeatableNudge } from "./NudgeButton";

type NudgePadProps = {
  step: NudgeStep;
  onStepChange: (step: NudgeStep) => void;
  onNudge: (action: NudgeAction) => void;
  disabled: boolean;
};

type Cell = { action: RepeatableNudge; icon: IconName } | "step";

const layout: Cell[] = [
  { action: "rotateCcw", icon: "rotateCcw" },
  { action: "moveUp", icon: "arrowUp" },
  { action: "rotateCw", icon: "rotateCw" },
  { action: "moveLeft", icon: "arrowLeft" },
  "step",
  { action: "moveRight", icon: "arrowRight" },
  { action: "scaleDown", icon: "minus" },
  { action: "moveDown", icon: "arrowDown" },
  { action: "scaleUp", icon: "plus" },
];

/**
 * Fine-adjust pad: core's `nudge` at 1 px / 1° / 1 % (fine) or 10 px / 5° / 5 % (coarse).
 * Hold a key to repeat. The centre key switches the speed.
 */
export function NudgePad({ step, onStepChange, onNudge, disabled }: NudgePadProps) {
  return (
    <div className="nudge-pad">
      {layout.map((cell) =>
        cell === "step" ? (
          <button
            key="step"
            type="button"
            className="icon-btn icon-btn-camera nudge-step value-text"
            aria-label={t(step === "fine" ? "camera.nudge.stepFine" : "camera.nudge.stepCoarse")}
            onClick={() => onStepChange(step === "fine" ? "coarse" : "fine")}
          >
            {t("camera.nudge.stepValue", { px: NUDGE_STEPS[step].move })}
          </button>
        ) : (
          <NudgeButton key={cell.action} {...cell} onNudge={onNudge} disabled={disabled} />
        ),
      )}
    </div>
  );
}
