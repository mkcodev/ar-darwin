import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { OnboardingScreen } from "../onboarding/OnboardingScreen";
import { useAppSettings } from "../settings/AppSettingsProvider";

/**
 * The first-run introduction (`/onboarding`, reached by the Library redirect while it was never
 * finished) and, with `?replay=1`, the same pages opened from Settings. Finishing the first run
 * saves that it was seen and goes to the Library; replaying only goes back to Settings and leaves
 * the saved flag alone. No header, and the iOS swipe-back is off: the pages have their own swipe.
 */
export default function Onboarding() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { finishOnboarding } = useAppSettings();
  const replaying = replay === "1";

  const finish = () => {
    if (replaying) {
      router.back();
      return;
    }
    finishOnboarding();
    router.replace("/");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <OnboardingScreen onFinish={finish} />
    </>
  );
}
