import type { NudgeAction } from "@ar-darwin/core";
import type { IconName } from "@ar-darwin/ui";
import { Icon } from "../../components/Icon";
import { useHoldRepeat } from "../../components/useHoldRepeat";
import { t } from "../../i18n";
import { playHaptic } from "../../theme/haptics";

export type RepeatableNudge = Exclude<NudgeAction, "reset">;

type NudgeButtonProps = {
  action: RepeatableNudge;
  icon: IconName;
  onNudge: (action: NudgeAction) => void;
  disabled: boolean;
};

/** One key of the fine-adjust pad. Hold to repeat; only the first step vibrates. */
export function NudgeButton({ action, icon, onNudge, disabled }: NudgeButtonProps) {
  const hold = useHoldRepeat((repeat) => {
    if (!repeat) playHaptic("nudgeStep");
    onNudge(action);
  });
  return (
    <button
      type="button"
      className="icon-btn icon-btn-camera"
      aria-label={t(`camera.nudge.${action}`)}
      disabled={disabled}
      {...hold}
    >
      <Icon name={icon} />
    </button>
  );
}
