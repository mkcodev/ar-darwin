import { space } from "@ar-darwin/ui";
import { useImage } from "@shopify/react-native-skia";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHandedness } from "../theme/HandednessProvider";
import { CameraOverlayScreen } from "./CameraOverlayScreen";
import { FpsMeter } from "./FpsMeter";
import { FpsToggle } from "./FpsToggle";
import { TestImageToggle } from "./TestImageToggle";

const TEST_IMAGES = {
  calibration: require("../../assets/images/test/calibration.png"),
  sketch: require("../../assets/images/test/darwin-i-think.png"),
};

/**
 * Camera spike (#17–#20) on the product camera (`CameraOverlayScreen`): the bundled test images
 * instead of a project's, plus the fps meter for the `preview` release build's measurements (see
 * docs/spikes/camera.md). Nothing here is saved.
 */
export function CameraSpikeScreen() {
  const insets = useSafeAreaInsets();
  const { controls } = useHandedness();
  const [showingSketch, setShowingSketch] = useState(false);
  const [showFps, setShowFps] = useState(false);
  const image = useImage(TEST_IMAGES[showingSketch ? "sketch" : "calibration"]);

  return (
    <CameraOverlayScreen
      image={image}
      extraControls={
        <>
          <TestImageToggle
            showingSketch={showingSketch}
            onToggle={() => setShowingSketch((s) => !s)}
          />
          <FpsToggle showing={showFps} onToggle={() => setShowFps((s) => !s)} />
        </>
      }
      overlay={
        // Stays visible while locked: the 10-minute test reads it while drawing.
        showFps && (
          <FpsMeter top={insets.top + space[5]} side={controls === "left" ? "right" : "left"} />
        )
      }
    />
  );
}
