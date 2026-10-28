import {
  cameraPill,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../components/Icon";
import { useTheme } from "../theme/ThemeProvider";

const labelText = toNativeTextStyle(typography.label);

type TileDoneButtonProps = {
  /** The current tile is marked as done. */
  done: boolean;
  /** Visible word: the same in both states, the accent says which one it is. */
  label: string;
  /** What the screen reader says (it also hears the checked state). */
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
};

/**
 * The «Hecho» toggle of the tile bar: a pill with a check and a word. Marked, its border and check
 * take the accent and the check redraws like a pencil stroke («trazo vivo»); the word stays in the
 * pill's text colour, as the accent is only guaranteed for graphics, not for text.
 */
export function TileDoneButton({
  done,
  label,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: TileDoneButtonProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;
  const [drawKey, setDrawKey] = useState(0);

  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: done }}
      onPress={() => {
        if (!done) setDrawKey((key) => key + 1);
        onPress();
      }}
      style={[styles.button, { borderColor: done ? c.accent : c.pillEdge }]}
    >
      {({ pressed }) => (
        <>
          {pressed && (
            <View
              pointerEvents="none"
              style={[styles.pressFill, { backgroundColor: c.text, opacity: opacity.pressFill }]}
            />
          )}
          <Icon name="check" color={done ? c.accent : c.muted} drawKey={drawKey} />
          <Text style={[labelText, { color: c.text }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[1],
    minHeight: touchTarget,
    paddingHorizontal: space[3],
    borderWidth: cameraPill.edgeWidth,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  pressFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
});
