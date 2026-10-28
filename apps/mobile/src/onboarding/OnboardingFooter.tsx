import type { OnboardingStep } from "@ar-darwin/core";
import { space } from "@ar-darwin/ui";
import { Linking, StyleSheet, View } from "react-native";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { OnboardingSteps } from "./OnboardingSteps";

type OnboardingFooterProps = {
  step: OnboardingStep;
  /** What the permission button does now (`cameraPermissionAction`). */
  permissionAction: "ready" | "request" | "openSettings";
  onRequestPermission: () => void;
  onNext: () => void;
  onFinish: () => void;
};

/**
 * The page indicator and the buttons. The first two pages have «Siguiente»; the camera page has
 * the permission button, which does what the system still allows (ask, or open the system settings
 * once it was denied for good), and ends with «Empezar» once granted. «Ahora no» ends the
 * onboarding without it: `CameraPermissionGate` asks again at the camera.
 */
export function OnboardingFooter({
  step,
  permissionAction,
  onRequestPermission,
  onNext,
  onFinish,
}: OnboardingFooterProps) {
  return (
    <View style={styles.footer}>
      <OnboardingSteps step={step} />
      {step !== "camera" ? (
        <Button variant="primary" fullWidth onPress={onNext}>
          {t("onboarding.next")}
        </Button>
      ) : permissionAction === "ready" ? (
        <Button variant="primary" fullWidth onPress={onFinish}>
          {t("onboarding.start")}
        </Button>
      ) : (
        <>
          <Button
            variant="primary"
            fullWidth
            onPress={permissionAction === "request" ? onRequestPermission : Linking.openSettings}
          >
            {t(
              permissionAction === "request"
                ? "onboarding.camera.allow"
                : "onboarding.camera.openSettings",
            )}
          </Button>
          <Button variant="ghost" fullWidth onPress={onFinish}>
            {t("onboarding.camera.later")}
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space[3] },
});
