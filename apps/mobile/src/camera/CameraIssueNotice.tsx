import type { CameraIssueKind } from "@ar-darwin/core";
import { Linking } from "react-native";
import { t } from "../i18n";
import { CameraNotice, type CameraNoticeAction } from "./CameraNotice";

type CameraIssueNoticeProps = {
  kind: CameraIssueKind;
  onRetry: () => void;
};

/**
 * Shown instead of a black screen (issue #19) when `<Camera>`'s `onError` fires, or CameraX
 * reports the camera is busy as an interruption (see `CameraOverlayScreen`'s
 * `onInterruptionStarted`).
 */
export function CameraIssueNotice({ kind, onRetry }: CameraIssueNoticeProps) {
  const actions: CameraNoticeAction[] = [{ label: t("cameraSpike.retry"), onPress: onRetry }];
  if (kind === "disabled") {
    actions.push({ label: t("cameraSpike.openSettings"), onPress: Linking.openSettings });
  }
  return (
    <CameraNotice
      title={t(`cameraSpike.issue.${kind}.title`)}
      body={t(`cameraSpike.issue.${kind}.body`)}
      actions={actions}
    />
  );
}
