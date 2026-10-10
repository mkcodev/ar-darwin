import { type IconName, icon } from "@ar-darwin/ui";
import { Canvas } from "@shopify/react-native-skia";
import { View } from "react-native";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { SkiaIcon } from "./SkiaIcon";

type IconProps = {
  name: IconName;
  size?: number;
  /** Defaults to the theme's primary text colour. */
  color?: string;
  /** Accessible name. Without it the icon is decorative (hidden from screen readers). */
  label?: string;
  /** «Trazo vivo»: every change of this number redraws the strokes. 0 shows it at rest. */
  drawKey?: number;
  /** Mirrors the glyph (e.g. rotate counter-clockwise from the clockwise arrow). */
  flip?: boolean;
};

/** A standalone icon: its own `<Canvas>` with a `SkiaIcon` inside. */
export function Icon({ name, size = icon.size, color, label, drawKey = 0, flip }: IconProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      style={{ width: size, height: size, transform: flip ? [{ scaleX: -1 }] : undefined }}
    >
      <Canvas style={{ width: size, height: size }}>
        <SkiaIcon
          name={name}
          size={size}
          color={color ?? theme.color.text.primary}
          drawKey={drawKey}
          reduce={reduce}
        />
      </Canvas>
    </View>
  );
}
