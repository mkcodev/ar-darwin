import { cameraDock, type IconName } from "@ar-darwin/ui";
import { Pressable, StyleSheet } from "react-native";
import { Icon } from "../components/Icon";
import { useTheme } from "../theme/ThemeProvider";

type DockIconButtonProps = {
  icon: IconName;
  /** Mirrors the glyph (the arrow back, drawn from the arrow forward). */
  flipGlyph?: boolean;
  /** Accessible name: the button has no visible text. */
  label: string;
  accessibilityHint?: string;
  onPress: () => void;
};

/**
 * A secondary action of the camera dock: a 48 dp zone in the well tone with a glyph, no outline
 * (the dock has just one). A `Pressable` of React Native, so it always receives its touches.
 */
export function DockIconButton({
  icon,
  flipGlyph,
  label,
  accessibilityHint,
  onPress,
}: DockIconButtonProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.wellPressed : c.well },
      ]}
    >
      <Icon name={icon} flip={flipGlyph} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: cameraDock.actionHeight,
    height: cameraDock.actionHeight,
    borderRadius: cameraDock.innerRadius,
    alignItems: "center",
    justifyContent: "center",
  },
});
